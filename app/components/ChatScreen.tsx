"use client";

import { useEffect, useRef, useState } from "react";
import type { ChatMessage, Figure, UserBio } from "@/src/types";
import { ProfileSheet } from "./ProfileSheet";

// Per-figure typical reply delay in ms — determines how long after the user
// sends a message the figure starts responding. Faster figures feel eager;
// slower ones feel busy / distracted / important. Random within the range.
function getReplyDelay(figureId: string): [number, number] {
  switch (figureId) {
    case "mozart":      return [400, 1500];   // hyperactive
    case "casanova":    return [400, 1500];   // smooth, fast
    case "marie":       return [500, 1800];   // sweet, prompt
    case "byron":       return [600, 2500];
    case "franklin":    return [800, 2500];
    case "henry8":      return [800, 2500];
    case "edison":      return [800, 2500];   // founder hustle
    case "columbus":    return [800, 2500];
    case "napoleon":    return [800, 2500];
    case "caligula":    return [600, 2500];   // erratic
    case "shakespeare": return [1500, 4500];
    case "galileo":     return [1500, 4500];
    case "vangogh":     return [1500, 4500];
    case "caesar":      return [1500, 4500];
    case "tycho":       return [2000, 5000];
    case "vlad":        return [2000, 5000];
    case "lincoln":     return [2000, 5000];
    case "elizabeth1":  return [2000, 6000];
    case "beethoven":   return [2000, 6000];
    case "leonardo":    return [2000, 6000];
    case "einstein":    return [2000, 6000];
    case "tesla":       return [1500, 5000];
    case "genghis":     return [2500, 6000];
    case "catherine":   return [3000, 7000];
    case "cleopatra":   return [3000, 8000];  // busy, important
    case "joan":        return [3000, 9000];  // off doing battle
    case "diogenes":    return [4000, 12000]; // not on his phone
    default:            return [1000, 3500];
  }
}

function pickDelay(range: [number, number]): number {
  const [min, max] = range;
  return min + Math.floor(Math.random() * (max - min));
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  const h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? "pm" : "am";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m.toString().padStart(2, "0")} ${ampm}`;
}

interface Props {
  figure: Figure;
  userBio: UserBio;
  avatarUrl: string;
  photoUrls: string[];
  messages: ChatMessage[];
  /** True if the figure unmatched. Locks the input. */
  ended?: boolean;
  onAppend: (newMessages: ChatMessage[]) => void;
  /** Called when the figure unmatches mid-conversation via [END] token. */
  onEndedByFigure?: () => void;
  onEnd: () => void;
  onBack: () => void;
}

export function ChatScreen({
  figure,
  userBio,
  avatarUrl,
  photoUrls,
  messages,
  ended = false,
  onAppend,
  onEndedByFigure,
  onEnd,
  onBack,
}: Props) {
  const [draft, setDraft] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [awaitingReply, setAwaitingReply] = useState(false);
  const [readAt, setReadAt] = useState<number | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streamingText, awaitingReply, readAt]);

  async function send() {
    if (ended) return;
    const text = draft.trim();
    if (!text || streaming || awaitingReply) return;
    const userMsg: ChatMessage = { role: "user", content: text, timestamp: Date.now() };
    const historyForApi = messages;
    onAppend([userMsg]);
    setDraft("");

    // Read-receipt + variable reply delay — figures don't all respond instantly.
    setAwaitingReply(true);
    setReadAt(null);
    const range = getReplyDelay(figure.id);
    const delay = pickDelay(range);
    // "Read at HH:MM" appears partway through the wait — like real iMessage.
    const readDelay = Math.min(delay * 0.4, 1500);
    setTimeout(() => setReadAt(Date.now()), readDelay);
    await new Promise((r) => setTimeout(r, delay));

    setAwaitingReply(false);
    setStreaming(true);
    setStreamingText("");

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        figureId: figure.id,
        userBio,
        history: historyForApi,
        userMessage: text,
      }),
    });

    // If the server returned an HTML error page (or anything other than the
    // expected text/plain stream), surface that as one error bubble instead
    // of splitting the HTML body into a wall of message bubbles.
    const contentType = res.headers.get("content-type") ?? "";
    if (!res.ok || !contentType.includes("text/plain")) {
      const fallback = !res.ok
        ? `[server error ${res.status}] try again in a moment.`
        : "[server returned an unexpected response — likely the server is missing OPENAI_API_KEY.]";
      onAppend([
        { role: "figure", content: fallback, timestamp: Date.now() },
      ]);
      setStreaming(false);
      setStreamingText("");
      return;
    }

    if (!res.body) {
      setStreaming(false);
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let acc = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      acc += decoder.decode(value, { stream: true });
      // Bail if the streamed content starts with HTML — never render that as
      // a chat message.
      if (/^\s*<(!doctype|html|pre|script)/i.test(acc)) {
        onAppend([
          {
            role: "figure",
            content:
              "[server streamed HTML instead of a chat response — usually a missing API key on the server.]",
            timestamp: Date.now(),
          },
        ]);
        setStreaming(false);
        setStreamingText("");
        try { await reader.cancel(); } catch {}
        return;
      }
      setStreamingText(acc);
    }

    // Check for the [END] token in the model's output. If present, strip it
    // and signal the parent that the figure has unmatched.
    const trimmed = acc.trim();
    let didEnd = false;
    let cleaned = acc;
    const endMatch = trimmed.match(/^\[END\]\s*/i);
    if (endMatch) {
      didEnd = true;
      cleaned = trimmed.slice(endMatch[0].length);
    }

    const figureMessages = cleaned
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean)
      .map<ChatMessage>((content) => ({ role: "figure", content, timestamp: Date.now() }));

    onAppend(figureMessages);
    setStreamingText("");
    setStreaming(false);
    if (didEnd && onEndedByFigure) {
      onEndedByFigure();
    }
  }

  return (
    <div className="mx-auto flex h-[100dvh] w-full max-w-md flex-col bg-ink-900">
      <header className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
        <button onClick={onBack} className="text-flame-400 hover:text-flame-300" aria-label="back">
          ←
        </button>
        <button
          type="button"
          onClick={() => setProfileOpen(true)}
          className="flex flex-1 items-center gap-3 rounded-full px-1 py-0.5 text-left transition hover:bg-white/5"
          aria-label={`view ${figure.displayName}'s profile`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={avatarUrl}
            alt={figure.displayName}
            className="h-10 w-10 rounded-full object-cover"
          />
          <div className="min-w-0">
            <p className="truncate font-semibold leading-tight">{figure.displayName}</p>
            <p className="truncate text-xs opacity-60">tap to view profile</p>
          </div>
        </button>
        <button
          onClick={onEnd}
          className="rounded-full border border-white/20 px-3 py-1 text-xs hover:bg-white/10"
        >
          end date
        </button>
      </header>

      <div ref={scrollRef} className="no-scrollbar flex-1 space-y-2 overflow-y-auto px-4 py-4">
        <p className="mb-2 text-center text-[10px] uppercase tracking-widest opacity-40">
          you matched with {figure.displayName} · {figure.era.toLowerCase()}
        </p>
        {messages.map((m, i) => (
          <Bubble key={i} role={m.role} text={m.content} />
        ))}
        {awaitingReply && readAt && (
          <div className="flex justify-end pr-1">
            <span className="text-[10px] tracking-wide opacity-50">
              Read {formatTime(readAt)}
            </span>
          </div>
        )}
        {streaming && <TypingBubble text={streamingText} />}
      </div>

      {profileOpen && (
        <ProfileSheet
          figure={figure}
          photoUrls={photoUrls}
          onClose={() => setProfileOpen(false)}
          hideActions
        />
      )}

      {ended ? (
        <footer className="border-t border-white/10 px-4 py-5 text-center">
          <p className="text-[10px] uppercase tracking-[0.2em] text-flame-400">
            {figure.displayName} unmatched
          </p>
          <p className="mt-1.5 text-xs opacity-50">
            they ended the conversation. you cannot reply.
          </p>
        </footer>
      ) : (
        <footer className="border-t border-white/10 px-3 py-3">
          <div className="flex items-end gap-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="say something charming"
              rows={1}
              className="flex-1 resize-none rounded-2xl bg-white/5 px-4 py-2 text-sm outline-none ring-flame-500/40 focus:ring-2"
            />
            <button
              onClick={send}
              disabled={streaming || awaitingReply || !draft.trim()}
              className="rounded-full bg-flame-500 px-4 py-2 text-sm font-semibold disabled:opacity-50"
            >
              send
            </button>
          </div>
        </footer>
      )}
    </div>
  );
}

function Bubble({ role, text }: { role: ChatMessage["role"]; text: string }) {
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm leading-snug ${
          isUser
            ? "rounded-br-md bg-flame-500 text-white"
            : "rounded-bl-md bg-white/10 text-white"
        }`}
      >
        {text}
      </div>
    </div>
  );
}

function TypingBubble({ text }: { text: string }) {
  if (!text) {
    return (
      <div className="flex justify-start">
        <div className="flex items-center gap-1 rounded-2xl rounded-bl-md bg-white/10 px-3 py-3">
          <Dot delay={0} />
          <Dot delay={150} />
          <Dot delay={300} />
        </div>
      </div>
    );
  }
  return <Bubble role="figure" text={text} />;
}

function Dot({ delay }: { delay: number }) {
  return (
    <span
      className="block h-1.5 w-1.5 animate-pulse rounded-full bg-white/60"
      style={{ animationDelay: `${delay}ms` }}
    />
  );
}

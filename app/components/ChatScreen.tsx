"use client";

import { useEffect, useRef, useState } from "react";
import type { ChatMessage, Figure, UserBio } from "@/src/types";
import { ProfileSheet } from "./ProfileSheet";

interface Props {
  figure: Figure;
  userBio: UserBio;
  avatarUrl: string;
  photoUrls: string[];
  messages: ChatMessage[];
  onAppend: (newMessages: ChatMessage[]) => void;
  onEnd: () => void;
  onBack: () => void;
}

export function ChatScreen({
  figure,
  userBio,
  avatarUrl,
  photoUrls,
  messages,
  onAppend,
  onEnd,
  onBack,
}: Props) {
  const [draft, setDraft] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streamingText]);

  async function send() {
    const text = draft.trim();
    if (!text || streaming) return;
    const userMsg: ChatMessage = { role: "user", content: text, timestamp: Date.now() };
    const historyForApi = messages;
    onAppend([userMsg]);
    setDraft("");
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
      setStreamingText(acc);
    }

    const figureMessages = acc
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean)
      .map<ChatMessage>((content) => ({ role: "figure", content, timestamp: Date.now() }));

    onAppend(figureMessages);
    setStreamingText("");
    setStreaming(false);
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
            disabled={streaming || !draft.trim()}
            className="rounded-full bg-flame-500 px-4 py-2 text-sm font-semibold disabled:opacity-50"
          >
            send
          </button>
        </div>
      </footer>
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

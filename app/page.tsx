"use client";

import { useEffect, useMemo, useState } from "react";
import { FIGURES, FIGURES_BY_ID } from "@/src/figures";
import type {
  ChatMessage,
  EndCard,
  Figure,
  Inbox as InboxT,
  UserBio,
} from "@/src/types";
import { BioInput } from "./components/BioInput";
import { SwipeDeck } from "./components/SwipeDeck";
import { Inbox } from "./components/Inbox";
import { ChatScreen } from "./components/ChatScreen";
import { RejectionView } from "./components/RejectionView";
import { EndCardView } from "./components/EndCardView";
import { MatchModal } from "./components/MatchModal";
import { ToastStack, type ToastItem } from "./components/ToastStack";
import {
  type FormState,
  EMPTY_FORM,
  serializeBio,
  isFormReady,
} from "@/src/bio";
import bakedPhotos from "@/data/baked-figures.json";

const PHOTOS = bakedPhotos as Record<string, string[]>;
const STORAGE_KEY = "histinder-state-v4";

type Tab = "deck" | "inbox";

type View =
  | { name: "tabs" }                              // deck OR inbox (controlled by activeTab)
  | { name: "chat"; figureId: string }
  | { name: "match-cut"; figureId: string }
  | { name: "rejection"; figureId: string }
  | { name: "endcard"; figureId: string }
  | { name: "edit-profile" };

interface Persisted {
  userForm: FormState;
  inbox: InboxT;
  swipedIds: string[];
  /** Stable shuffled order of figure ids for this session. */
  figureOrder: string[];
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

export default function Page() {
  const [hydrated, setHydrated] = useState(false);
  const [userForm, setUserForm] = useState<FormState>(EMPTY_FORM);
  const [inbox, setInbox] = useState<InboxT>({});
  const [swipedIds, setSwipedIds] = useState<Set<string>>(new Set());
  const [figureOrder, setFigureOrder] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("deck");
  const [view, setView] = useState<View>({ name: "tabs" });

  const hasProfile = isFormReady(userForm);
  const userBio = useMemo(() => serializeBio(userForm), [userForm]);

  const [endCard, setEndCard] = useState<EndCard | null>(null);
  const [endCardLoading, setEndCardLoading] = useState(false);

  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // ── load
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const p = JSON.parse(raw) as Persisted;
        setUserForm({ ...EMPTY_FORM, ...(p.userForm || {}) });
        setInbox(p.inbox || {});
        setSwipedIds(new Set(p.swipedIds || []));
        const persistedOrder = p.figureOrder || [];
        // If a new figure was added since last save, append it; if the order
        // is stale or missing, regenerate.
        const allIds = FIGURES.map((f) => f.id);
        const known = new Set(persistedOrder);
        const newIds = allIds.filter((id) => !known.has(id));
        const cleanedOrder = persistedOrder.filter((id) => allIds.includes(id));
        if (cleanedOrder.length === 0) {
          setFigureOrder(shuffle(allIds));
        } else if (newIds.length > 0) {
          setFigureOrder([...cleanedOrder, ...shuffle(newIds)]);
        } else {
          setFigureOrder(cleanedOrder);
        }
      } else {
        setFigureOrder(shuffle(FIGURES.map((f) => f.id)));
      }
    } catch {
      setFigureOrder(shuffle(FIGURES.map((f) => f.id)));
    }
    setHydrated(true);
  }, []);

  // ── save
  useEffect(() => {
    if (!hydrated) return;
    const persisted: Persisted = {
      userForm,
      inbox,
      swipedIds: Array.from(swipedIds),
      figureOrder,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
  }, [hydrated, userForm, inbox, swipedIds, figureOrder]);

  const remainingFigures = useMemo(() => {
    if (figureOrder.length === 0) return [];
    return figureOrder
      .map((id) => FIGURES_BY_ID[id])
      .filter((f): f is Figure => Boolean(f) && !swipedIds.has(f.id));
  }, [figureOrder, swipedIds]);

  const unreadCount = useMemo(
    () =>
      Object.values(inbox).filter((e) =>
        e.kind === "match" ? e.unread : !e.read,
      ).length,
    [inbox],
  );

  // ── handlers ────────────────────────────────────────────────────────────────

  function handleBioSubmit(form: FormState) {
    setUserForm(form);
    setView({ name: "tabs" });
  }

  function rememberSwiped(id: string) {
    setSwipedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }

  function handleInterested(figure: Figure) {
    // Immediately advance the deck. Decision happens in the background.
    rememberSwiped(figure.id);

    // Random delay so it feels like the figure is taking a beat to respond.
    const delayMs = 2000 + Math.floor(Math.random() * 4000);
    const matched = Math.random() < figure.matchProbability;

    setTimeout(() => {
      if (matched) {
        resolveMatch(figure);
      } else {
        resolveRejection(figure);
      }
    }, delayMs);
  }

  async function resolveMatch(figure: Figure) {
    // Create the inbox entry first so the toast can link to it.
    setInbox((prev) => ({
      ...prev,
      [figure.id]: {
        kind: "match",
        figureId: figure.id,
        messages: [],
        unread: true,
        matchedAt: Date.now(),
      },
    }));
    pushToast({ figureId: figure.id, kind: "match" });

    // Generate the opener async and append when ready. The toast / inbox /
    // match modal will all update reactively.
    const dynamicOpener = await fetchOpening(figure.id, userBio);
    const opener = dynamicOpener ?? figure.openingLine;
    appendMessages(figure.id, [
      { role: "figure", content: opener, timestamp: Date.now() },
    ]);
  }

  async function resolveRejection(figure: Figure) {
    const message = await fetchRejection(figure.id, userBio);
    if (!message) return; // silent fail — better than a generic placeholder
    setInbox((prev) => ({
      ...prev,
      [figure.id]: {
        kind: "rejection",
        figureId: figure.id,
        rejectionMessage: message,
        read: false,
        rejectedAt: Date.now(),
      },
    }));
    pushToast({ figureId: figure.id, kind: "rejection" });
  }

  function pushToast(t: { figureId: string; kind: "match" | "rejection" }) {
    setToasts((prev) => [
      ...prev,
      { id: `${t.figureId}-${Date.now()}-${Math.random()}`, ...t },
    ]);
  }

  function dismissToast(id: string) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  function openToast(t: ToastItem) {
    dismissToast(t.id);
    if (t.kind === "match") {
      setView({ name: "match-cut", figureId: t.figureId });
    } else {
      // open rejection detail directly
      const entry = inbox[t.figureId];
      if (entry?.kind === "rejection" && !entry.read) {
        setInbox((prev) => ({
          ...prev,
          [t.figureId]: { ...entry, read: true },
        }));
      }
      setView({ name: "rejection", figureId: t.figureId });
    }
  }

  async function fetchRejection(figureId: string, bio: string): Promise<string | null> {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await fetch("/api/rejection", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ figureId, userBio: bio }),
        });
        if (!res.ok) continue;
        const data = (await res.json()) as { message?: string };
        if (data.message && data.message.trim()) return data.message.trim();
      } catch {
        // try again
      }
    }
    return null;
  }

  async function fetchOpening(figureId: string, bio: string): Promise<string | null> {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await fetch("/api/opening", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ figureId, userBio: bio }),
        });
        if (!res.ok) continue;
        const data = (await res.json()) as { message?: string };
        if (data.message && data.message.trim()) return data.message.trim();
      } catch {
        // try again
      }
    }
    return null;
  }

  function handlePass(figure: Figure) {
    rememberSwiped(figure.id);
  }

  function handleOpenInboxEntry(figureId: string) {
    const entry = inbox[figureId];
    if (!entry) return;
    if (entry.kind === "match") {
      // Mark unread → read on open.
      if (entry.unread) {
        setInbox((prev) => ({
          ...prev,
          [figureId]: { ...entry, unread: false },
        }));
      }
      setView({ name: "chat", figureId });
    } else {
      if (!entry.read) {
        setInbox((prev) => ({
          ...prev,
          [figureId]: { ...entry, read: true },
        }));
      }
      setView({ name: "rejection", figureId });
    }
  }

  function appendMessages(figureId: string, newMessages: ChatMessage[]) {
    setInbox((prev) => {
      const entry = prev[figureId];
      if (!entry || entry.kind !== "match") return prev;
      return {
        ...prev,
        [figureId]: {
          ...entry,
          messages: [...entry.messages, ...newMessages],
          matchedAt: Date.now(), // bump for inbox sort
        },
      };
    });
  }

  function markMatchEnded(figureId: string) {
    setInbox((prev) => {
      const entry = prev[figureId];
      if (!entry || entry.kind !== "match") return prev;
      return {
        ...prev,
        [figureId]: {
          ...entry,
          ended: true,
          endedAt: Date.now(),
        },
      };
    });
  }

  async function handleEndDate(figureId: string) {
    const entry = inbox[figureId];
    if (!entry || entry.kind !== "match") return;
    setView({ name: "endcard", figureId });
    setEndCard(null);
    setEndCardLoading(true);
    try {
      const res = await fetch("/api/end-card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          figureId,
          userBio,
          transcript: entry.messages,
        }),
      });
      if (res.ok) setEndCard((await res.json()) as EndCard);
    } finally {
      setEndCardLoading(false);
    }
  }

  function resetEverything() {
    if (!confirm("Reset Histinder? This wipes your bio, inbox, and swipes.")) return;
    localStorage.removeItem(STORAGE_KEY);
    setUserForm(EMPTY_FORM);
    setInbox({});
    setSwipedIds(new Set());
    setFigureOrder(shuffle(FIGURES.map((f) => f.id)));
    setView({ name: "tabs" });
    setActiveTab("deck");
  }

  // ── render ──────────────────────────────────────────────────────────────────

  if (!hydrated) return null;

  if (!hasProfile) {
    return <BioInput onSubmit={handleBioSubmit} />;
  }

  let screen: React.ReactNode = null;

  if (view.name === "edit-profile") {
    screen = (
      <BioInput
        onSubmit={(form) => {
          setUserForm(form);
          setView({ name: "tabs" });
        }}
        onCancel={() => setView({ name: "tabs" })}
        initial={userForm}
        submitLabel="save changes"
        minimal
      />
    );
  } else if (view.name === "match-cut") {
    const figure = FIGURES_BY_ID[view.figureId]!;
    const entry = inbox[view.figureId];
    const firstFigureMessage =
      entry?.kind === "match"
        ? entry.messages.find((m) => m.role === "figure")?.content ?? null
        : null;
    screen = (
      <MatchModal
        figure={figure}
        heroPhotoUrl={(PHOTOS[figure.id] ?? [])[0] ?? ""}
        openingMessage={firstFigureMessage}
        onSendMessage={() => {
          if (entry?.kind === "match" && entry.unread) {
            setInbox((prev) => ({
              ...prev,
              [figure.id]: { ...entry, unread: false },
            }));
          }
          setView({ name: "chat", figureId: figure.id });
        }}
        onKeepSwiping={() => {
          setActiveTab("deck");
          setView({ name: "tabs" });
        }}
      />
    );
  } else if (view.name === "chat") {
    const figure = FIGURES_BY_ID[view.figureId]!;
    const entry = inbox[view.figureId];
    if (!entry || entry.kind !== "match") {
      setView({ name: "tabs" });
      return null;
    }
    screen = (
      <ChatScreen
        figure={figure}
        userBio={userBio}
        avatarUrl={(PHOTOS[figure.id] ?? [])[0] ?? ""}
        photoUrls={PHOTOS[figure.id] ?? []}
        messages={entry.messages}
        ended={Boolean(entry.ended)}
        onAppend={(msgs) => appendMessages(figure.id, msgs)}
        onEndedByFigure={() => markMatchEnded(figure.id)}
        onEnd={() => handleEndDate(figure.id)}
        onBack={() => {
          setActiveTab("inbox");
          setView({ name: "tabs" });
        }}
      />
    );
  } else if (view.name === "rejection") {
    const figure = FIGURES_BY_ID[view.figureId]!;
    const entry = inbox[view.figureId];
    if (!entry || entry.kind !== "rejection") {
      setView({ name: "tabs" });
      return null;
    }
    screen = (
      <RejectionView
        figure={figure}
        entry={entry}
        avatarUrl={(PHOTOS[figure.id] ?? [])[0] ?? ""}
        onBack={() => {
          setActiveTab("inbox");
          setView({ name: "tabs" });
        }}
      />
    );
  } else if (view.name === "endcard") {
    const figure = FIGURES_BY_ID[view.figureId]!;
    screen = (
      <EndCardView
        figure={figure}
        card={endCard}
        loading={endCardLoading}
        onRestart={() => {
          setActiveTab("inbox");
          setView({ name: "tabs" });
        }}
      />
    );
  } else {
    // Tabs view
    screen = (
      <main
        className="mx-auto flex w-full max-w-md flex-col"
        style={{
          height: "100dvh",
          paddingTop: "env(safe-area-inset-top)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        <Header
          activeTab={activeTab}
          onTab={setActiveTab}
          unread={unreadCount}
          onEditProfile={() => setView({ name: "edit-profile" })}
          onReset={resetEverything}
        />
        <div className="min-h-0 flex-1 overflow-hidden">
          {activeTab === "deck" && (
            <div className="flex h-full flex-col px-4">
              <SwipeDeck
                figures={remainingFigures}
                photosByFigure={PHOTOS}
                onInterested={handleInterested}
                onPass={handlePass}
              />
            </div>
          )}
          {activeTab === "inbox" && (
            <Inbox
              inbox={inbox}
              figuresById={FIGURES_BY_ID}
              photosByFigure={PHOTOS}
              onOpen={handleOpenInboxEntry}
            />
          )}
        </div>
      </main>
    );
  }

  return (
    <>
      {screen}
      <ToastStack
        toasts={toasts}
        figuresById={FIGURES_BY_ID}
        photosByFigure={PHOTOS}
        onOpen={openToast}
        onDismiss={dismissToast}
      />
    </>
  );
}

function Header({
  activeTab,
  onTab,
  unread,
  onEditProfile,
  onReset,
}: {
  activeTab: Tab;
  onTab: (t: Tab) => void;
  unread: number;
  onEditProfile: () => void;
  onReset: () => void;
}) {
  return (
    <header className="flex items-center justify-between gap-2 px-4 pt-4 pb-2 sm:px-5">
      <button
        type="button"
        onClick={onEditProfile}
        aria-label="edit your profile"
        className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/15 bg-white/5 text-base transition hover:border-flame-500/50 hover:bg-flame-500/10"
      >
        🙂
      </button>
      <nav className="flex rounded-full border border-white/10 bg-white/[0.03] p-1 text-xs">
        <TabButton active={activeTab === "deck"} onClick={() => onTab("deck")}>
          discover
        </TabButton>
        <TabButton active={activeTab === "inbox"} onClick={() => onTab("inbox")}>
          <span className="flex items-center gap-1.5">
            inbox
            {unread > 0 && (
              <span className="grid h-4 min-w-[16px] place-items-center rounded-full bg-flame-500 px-1 text-[10px] font-bold text-white">
                {unread}
              </span>
            )}
          </span>
        </TabButton>
      </nav>
      <button
        type="button"
        onClick={onReset}
        className="text-[10px] uppercase tracking-[0.2em] opacity-30 hover:opacity-60"
      >
        reset
      </button>
    </header>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-1.5 font-medium transition ${
        active ? "bg-flame-500 text-white" : "text-white/60 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

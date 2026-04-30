"use client";

import { useEffect, useMemo, useState } from "react";
import { FIGURES, FIGURES_BY_ID } from "@/src/figures";
import type {
  ChatMessage,
  EndCard,
  Figure,
  Inbox as InboxT,
  MatchEntry,
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
import { AccountView } from "./components/AccountView";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
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

  // ── Auth: optional. Anonymous mode still works fully.
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [accountEmail, setAccountEmail] = useState<string | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);

  // Subscribe to Supabase auth state once on mount.
  useEffect(() => {
    const sb = getSupabaseBrowser();
    if (!sb) return;
    let mounted = true;
    sb.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      const session = data.session;
      setAccessToken(session?.access_token ?? null);
      setAccountEmail(session?.user.email ?? null);
    });
    const sub = sb.auth.onAuthStateChange((_event, session) => {
      setAccessToken(session?.access_token ?? null);
      setAccountEmail(session?.user.email ?? null);
    });
    return () => {
      mounted = false;
      sub.data.subscription.unsubscribe();
    };
  }, []);

  // Helper: fetch with Authorization header attached when signed in.
  const authFetch = (input: RequestInfo, init: RequestInit = {}) => {
    const headers = new Headers(init.headers ?? {});
    if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
    return fetch(input, { ...init, headers });
  };

  // ── load (server first, localStorage fallback)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let loaded: Persisted | null = null;

      // 1. Try server (Vercel KV via /api/state). Identified by httpOnly cookie.
      try {
        const res = await authFetch("/api/state", { cache: "no-store" });
        if (res.ok) {
          const data = (await res.json()) as { state: Persisted | null };
          if (data.state) loaded = data.state;
        }
      } catch {
        // network failure — fall through to localStorage
      }

      // 2. Fall back to localStorage (offline / pre-KV state).
      if (!loaded) {
        try {
          const raw = localStorage.getItem(STORAGE_KEY);
          if (raw) loaded = JSON.parse(raw) as Persisted;
        } catch {
          // bad data — ignore
        }
      }

      if (cancelled) return;

      const allIds = FIGURES.map((f) => f.id);

      if (loaded) {
        setUserForm({ ...EMPTY_FORM, ...(loaded.userForm || {}) });
        setInbox(loaded.inbox || {});
        setSwipedIds(new Set(loaded.swipedIds || []));

        const persistedOrder = loaded.figureOrder || [];
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
        setFigureOrder(shuffle(allIds));
      }
      setHydrated(true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // ── save (localStorage immediately, server debounced)
  useEffect(() => {
    if (!hydrated) return;
    const persisted: Persisted = {
      userForm,
      inbox,
      swipedIds: Array.from(swipedIds),
      figureOrder,
    };
    // Local cache: instant.
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
    } catch {
      // private mode / quota — ignore
    }
    // Server: debounced 600ms so rapid edits don't spam the API.
    const timer = setTimeout(() => {
      authFetch("/api/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(persisted),
      }).catch(() => {
        // server unreachable — localStorage still has it
      });
    }, 600);
    return () => clearTimeout(timer);
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
        const res = await authFetch("/api/rejection", {
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
        const res = await authFetch("/api/opening", {
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

  // ── Auto-bump: if the user has been silent on a match for 1+ minute, the
  // figure sends a follow-up nudge. Polls every 30s. Each match can only be
  // bumped once per "wait period" (until the user replies, the bump is locked).
  useEffect(() => {
    if (!hydrated) return;
    const BUMP_AFTER_MS = 60_000;
    const POLL_MS = 30_000;

    let cancelled = false;
    const tick = async () => {
      const now = Date.now();
      const candidates: MatchEntry[] = [];
      for (const entry of Object.values(inbox)) {
        if (entry.kind !== "match") continue;
        if (entry.ended) continue;
        const last = entry.messages[entry.messages.length - 1];
        if (!last || last.role !== "figure") continue;
        if (now - last.timestamp < BUMP_AFTER_MS) continue;

        // Was the last user message AFTER the last bump? If yes, bump is fresh.
        const lastUser = [...entry.messages].reverse().find((m) => m.role === "user");
        const lastUserAt = lastUser?.timestamp ?? entry.matchedAt;
        const alreadyBumped = entry.bumpedAt && entry.bumpedAt > lastUserAt;
        if (alreadyBumped) continue;

        candidates.push(entry);
      }

      for (const entry of candidates) {
        if (cancelled) return;
        try {
          const res = await authFetch("/api/bump", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              figureId: entry.figureId,
              userBio,
              history: entry.messages,
            }),
          });
          if (!res.ok) continue;
          const data = (await res.json()) as { message?: string };
          if (!data.message) continue;
          if (cancelled) return;
          setInbox((prev) => {
            const e = prev[entry.figureId];
            if (!e || e.kind !== "match") return prev;
            return {
              ...prev,
              [entry.figureId]: {
                ...e,
                messages: [
                  ...e.messages,
                  { role: "figure", content: data.message!, timestamp: Date.now() },
                ],
                unread: true,
                bumpedAt: Date.now(),
                matchedAt: Date.now(),
              },
            };
          });
          // Toast if the user is not currently in this chat
          if (!(view.name === "chat" && view.figureId === entry.figureId)) {
            pushToast({ figureId: entry.figureId, kind: "match" });
          }
        } catch {
          // best-effort
        }
      }
    };

    const id = setInterval(tick, POLL_MS);
    // Run once on mount/hydrate too, so a tab-revisit gets a quick check.
    const initial = setTimeout(tick, 5_000);
    return () => {
      cancelled = true;
      clearInterval(id);
      clearTimeout(initial);
    };
  }, [hydrated, inbox, userBio, view]);

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
      const res = await authFetch("/api/end-card", {
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

  // ── Auth handlers passed to AccountView ─────────────────────────────────────

  async function handleSignedUp(token: string) {
    // Use the freshly-issued token to migrate cookie state to the new auth user.
    try {
      await fetch("/api/migrate", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      // ignore — anonymous data simply stays under the cookie
    }
    // Re-pull state under the new auth identity.
    try {
      const res = await fetch("/api/state", {
        cache: "no-store",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = (await res.json()) as { state: Persisted | null };
        if (data.state) applyLoadedState(data.state);
      }
    } catch {}
  }

  async function handleSignedIn(token: string) {
    // Replace local state with the account's saved state.
    try {
      const res = await fetch("/api/state", {
        cache: "no-store",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = (await res.json()) as { state: Persisted | null };
        if (data.state) {
          applyLoadedState(data.state);
        } else {
          // Brand-new account with no saved state — start fresh.
          setUserForm(EMPTY_FORM);
          setInbox({});
          setSwipedIds(new Set());
          setFigureOrder(shuffle(FIGURES.map((f) => f.id)));
        }
      }
    } catch {}
  }

  function handleSignedOut() {
    // Token is cleared by Supabase; future requests fall back to cookie state.
    // Nothing to do beyond letting the load effect re-run on the next reload.
  }

  function applyLoadedState(loaded: Persisted) {
    const allIds = FIGURES.map((f) => f.id);
    setUserForm({ ...EMPTY_FORM, ...(loaded.userForm || {}) });
    setInbox(loaded.inbox || {});
    setSwipedIds(new Set(loaded.swipedIds || []));
    const persistedOrder = loaded.figureOrder || [];
    const known = new Set(persistedOrder);
    const newIds = allIds.filter((id) => !known.has(id));
    const cleanedOrder = persistedOrder.filter((id) => allIds.includes(id));
    if (cleanedOrder.length === 0) setFigureOrder(shuffle(allIds));
    else if (newIds.length > 0) setFigureOrder([...cleanedOrder, ...shuffle(newIds)]);
    else setFigureOrder(cleanedOrder);
  }

  function resetEverything() {
    if (!confirm("Reset Histinder? This wipes your bio, inbox, and swipes.")) return;
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    authFetch("/api/state", { method: "DELETE" }).catch(() => {});
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
        accessToken={accessToken}
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
          onAccount={() => setAccountOpen(true)}
          accountSignedIn={Boolean(accountEmail)}
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
      {accountOpen && (
        <AccountView
          signedInAs={accountEmail}
          onSignedUp={handleSignedUp}
          onSignedIn={handleSignedIn}
          onSignedOut={handleSignedOut}
          onClose={() => setAccountOpen(false)}
        />
      )}
    </>
  );
}

function Header({
  activeTab,
  onTab,
  unread,
  onEditProfile,
  onAccount,
  accountSignedIn,
  onReset,
}: {
  activeTab: Tab;
  onTab: (t: Tab) => void;
  unread: number;
  onEditProfile: () => void;
  onAccount: () => void;
  accountSignedIn: boolean;
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
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onAccount}
          className={`text-[10px] uppercase tracking-[0.2em] transition ${
            accountSignedIn
              ? "text-flame-400 hover:text-flame-300"
              : "opacity-50 hover:opacity-100"
          }`}
        >
          {accountSignedIn ? "account" : "sign in"}
        </button>
        <button
          type="button"
          onClick={onReset}
          aria-label="reset all data"
          className="text-[10px] uppercase tracking-[0.2em] opacity-25 hover:opacity-60"
        >
          reset
        </button>
      </div>
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

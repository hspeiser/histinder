"use client";

import { useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

interface Props {
  /** Email of currently signed-in user, if any. */
  signedInAs: string | null;
  /** Called after a successful sign-up so the parent can run migration. */
  onSignedUp: (accessToken: string) => Promise<void>;
  /** Called after a successful sign-in so the parent can refresh state. */
  onSignedIn: (accessToken: string) => Promise<void>;
  /** Called after sign out. */
  onSignedOut: () => void;
  onClose: () => void;
}

export function AccountView({
  signedInAs,
  onSignedUp,
  onSignedIn,
  onSignedOut,
  onClose,
}: Props) {
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const sb = getSupabaseBrowser();
  const dbAvailable = Boolean(sb);

  async function handleSubmit() {
    if (!sb) {
      setError("supabase isn't configured. accounts unavailable.");
      return;
    }
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error } = await sb.auth.signUp({ email, password });
        if (error) throw error;
        const token = data.session?.access_token;
        if (!token) {
          // Email confirmation required (depending on Supabase settings).
          setInfo("check your email — confirm to finish creating your account.");
          setLoading(false);
          return;
        }
        await onSignedUp(token);
        onClose();
      } else {
        const { data, error } = await sb.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        const token = data.session?.access_token;
        if (!token) throw new Error("no session after sign-in");
        await onSignedIn(token);
        onClose();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "unexpected error";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSignOut() {
    if (!sb) return;
    setLoading(true);
    try {
      await sb.auth.signOut();
      onSignedOut();
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : "sign out failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fade-in fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-md sm:items-center">
      <div
        className="sheet-up relative flex w-full max-w-md flex-col bg-ink-900 sm:my-8 sm:rounded-3xl sm:shadow-card"
        style={{
          paddingTop: "env(safe-area-inset-top)",
          paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)",
        }}
      >
        <header className="flex items-center justify-between px-5 pt-4 pb-2 sm:pt-6">
          <p className="text-[10px] uppercase tracking-[0.25em] opacity-50">
            account
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label="close"
            className="grid h-9 w-9 place-items-center rounded-full border border-white/15 bg-white/5 text-base hover:bg-white/10"
          >
            ✕
          </button>
        </header>

        <div className="px-6 pb-6 pt-2 sm:px-7">
          <h1 className="font-serif text-3xl tracking-tight">
            {signedInAs ? "you're signed in" : mode === "signup" ? "save your matches" : "welcome back"}
          </h1>
          <p className="mt-2 text-sm opacity-70">
            {signedInAs
              ? `signed in as ${signedInAs}. your bio, inbox, and chats sync across devices.`
              : "by default Histinder remembers you in this browser only. sign up to save your bio, matches, and chats so you can come back from any device."}
          </p>

          {!dbAvailable && (
            <p className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs">
              accounts aren't enabled on this deploy yet —
              NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY missing.
            </p>
          )}

          {signedInAs ? (
            <button
              type="button"
              onClick={handleSignOut}
              disabled={loading}
              className="mt-6 w-full rounded-full border border-white/20 bg-white/5 py-3.5 text-sm font-semibold uppercase tracking-[0.18em] hover:bg-white/10 disabled:opacity-50"
            >
              {loading ? "signing out…" : "sign out"}
            </button>
          ) : (
            <>
              <div className="mt-6 flex rounded-full border border-white/10 bg-white/[0.03] p-1 text-xs">
                <ModeButton active={mode === "signup"} onClick={() => setMode("signup")}>
                  create account
                </ModeButton>
                <ModeButton active={mode === "signin"} onClick={() => setMode("signin")}>
                  sign in
                </ModeButton>
              </div>

              <div className="mt-5 space-y-4">
                <FormRow label="email">
                  <input
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@somewhere.com"
                    className="w-full rounded-xl border border-white/12 bg-ink-900/80 px-3.5 py-2.5 text-[15px] outline-none ring-flame-500/40 backdrop-blur transition placeholder:opacity-30 focus:border-flame-500/60 focus:ring-2"
                  />
                </FormRow>
                <FormRow label="password">
                  <input
                    type="password"
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="at least 6 characters"
                    className="w-full rounded-xl border border-white/12 bg-ink-900/80 px-3.5 py-2.5 text-[15px] outline-none ring-flame-500/40 backdrop-blur transition placeholder:opacity-30 focus:border-flame-500/60 focus:ring-2"
                  />
                </FormRow>
              </div>

              {error && (
                <p className="mt-3 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                  {error}
                </p>
              )}
              {info && (
                <p className="mt-3 rounded-xl border border-flame-500/20 bg-flame-500/10 px-3 py-2 text-xs">
                  {info}
                </p>
              )}

              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading || !email || !password || !dbAvailable}
                className="mt-5 w-full rounded-full bg-flame-500 py-3.5 text-sm font-semibold uppercase tracking-[0.18em] hover:bg-flame-400 disabled:cursor-not-allowed disabled:opacity-30"
              >
                {loading
                  ? "…"
                  : mode === "signup"
                    ? "create account"
                    : "sign in"}
              </button>

              <p className="mt-4 text-[11px] opacity-40">
                no email confirmation? toggle it off in supabase → authentication →
                providers → email.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ModeButton({
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
      className={`flex-1 rounded-full px-3 py-2 font-medium transition ${
        active ? "bg-flame-500 text-white" : "text-white/60 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

function FormRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-white/55">
        {label}
      </label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

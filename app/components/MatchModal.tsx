"use client";

import type { Figure } from "@/src/types";

interface Props {
  figure: Figure;
  heroPhotoUrl: string;
  /** Null while the opening line is still generating. */
  openingMessage: string | null;
  onSendMessage: () => void;
  onKeepSwiping: () => void;
}

export function MatchModal({
  figure,
  heroPhotoUrl,
  openingMessage,
  onSendMessage,
  onKeepSwiping,
}: Props) {
  return (
    <div className="fade-in fixed inset-0 z-50 flex flex-col items-center justify-between overflow-hidden bg-ink-900">
      {heroPhotoUrl && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={heroPhotoUrl}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover opacity-25 blur-2xl"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-ink-900/70 via-ink-900/60 to-ink-900" />
        </>
      )}

      <div className="relative flex w-full max-w-md flex-1 flex-col items-center justify-center px-8">
        <p className="text-[11px] uppercase tracking-[0.4em] text-flame-400">
          it's a
        </p>
        <p className="font-serif text-7xl tracking-tight text-flame-500">
          match.
        </p>

        {/* avatar */}
        <div className="mt-10 grid place-items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={heroPhotoUrl}
            alt={figure.displayName}
            className="h-32 w-32 rounded-full object-cover ring-2 ring-flame-500/60 ring-offset-4 ring-offset-ink-900"
          />
          <p className="mt-4 font-serif text-3xl tracking-tight">
            {figure.displayName}
          </p>
          <p className="mt-1 text-xs uppercase tracking-[0.2em] opacity-50">
            {figure.era}
          </p>
        </div>

        {/* opening message preview */}
        <div className="mt-10 w-full max-w-sm">
          <p className="mb-2 text-center text-[10px] uppercase tracking-[0.25em] opacity-40">
            they sent you a message
          </p>
          <div className="flex justify-start">
            <div className="max-w-[88%] rounded-2xl rounded-bl-md bg-white/10 px-4 py-3 text-[15px] leading-relaxed text-white/95">
              {openingMessage ? (
                openingMessage
              ) : (
                <span className="flex items-center gap-1.5">
                  <Dot delay={0} />
                  <Dot delay={150} />
                  <Dot delay={300} />
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="relative w-full max-w-md space-y-3 px-6 pb-8">
        <button
          type="button"
          onClick={onSendMessage}
          className="w-full rounded-full bg-flame-500 py-4 text-sm font-semibold uppercase tracking-[0.2em] text-white shadow-lg shadow-flame-500/30 transition hover:bg-flame-400 active:scale-[0.99]"
        >
          send a message
        </button>
        <button
          type="button"
          onClick={onKeepSwiping}
          className="w-full rounded-full border border-white/15 bg-white/[0.03] py-4 text-sm font-medium tracking-wide text-white/80 transition hover:bg-white/10"
        >
          keep swiping
        </button>
      </div>
    </div>
  );
}

function Dot({ delay }: { delay: number }) {
  return (
    <span
      className="block h-2 w-2 animate-pulse rounded-full bg-white/70"
      style={{ animationDelay: `${delay}ms` }}
    />
  );
}

"use client";

import type { Figure, RejectionEntry } from "@/src/types";

interface Props {
  figure: Figure;
  entry: RejectionEntry;
  avatarUrl: string;
  onBack: () => void;
}

export function RejectionView({ figure, entry, avatarUrl, onBack }: Props) {
  return (
    <div className="mx-auto flex h-[100dvh] w-full max-w-md flex-col bg-ink-900">
      <header className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
        <button onClick={onBack} className="text-flame-400 hover:text-flame-300" aria-label="back">
          ←
        </button>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={avatarUrl}
          alt={figure.displayName}
          className="h-10 w-10 rounded-full object-cover grayscale"
        />
        <div className="flex-1">
          <p className="font-semibold leading-tight">{figure.displayName}</p>
          <p className="text-xs opacity-50">{figure.era}</p>
        </div>
        <span className="rounded-full bg-white/5 px-2 py-1 text-[10px] uppercase tracking-wider opacity-60">
          unmatched
        </span>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <p className="text-[10px] uppercase tracking-[0.25em] opacity-40">
          they sent one message and unmatched
        </p>
        <div className="mt-6 w-full">
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-white/10 px-4 py-3 text-left text-[15px] leading-relaxed text-white/90">
              {entry.rejectionMessage}
            </div>
          </div>
        </div>
        <p className="mt-12 text-xs opacity-40">
          they cannot be messaged.
        </p>
      </div>

      <footer className="border-t border-white/10 px-6 py-4">
        <button
          onClick={onBack}
          className="w-full rounded-full border border-white/15 bg-white/5 py-3 text-sm font-medium hover:bg-white/10"
        >
          back to inbox
        </button>
      </footer>
    </div>
  );
}

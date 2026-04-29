"use client";

import type { EndCard, Figure } from "@/src/types";

interface Props {
  figure: Figure;
  card: EndCard | null;
  loading: boolean;
  onRestart: () => void;
}

export function EndCardView({ figure, card, loading, onRestart }: Props) {
  return (
    <div className="mx-auto flex h-[100dvh] w-full max-w-md flex-col items-center justify-center px-5">
      <div className="w-full rounded-3xl border border-white/10 bg-ink-800 p-6 shadow-card">
        <p className="text-center text-xs uppercase tracking-[0.3em] text-flame-400">
          how it ended
        </p>
        <h2 className="mt-2 text-center text-2xl font-bold">
          you & {figure.displayName}
        </h2>
        <p className="mt-1 text-center text-xs opacity-60">{figure.era}</p>

        {loading || !card ? (
          <div className="mt-8 grid place-items-center py-10">
            <div className="h-2 w-32 animate-pulse rounded-full bg-white/20" />
            <p className="mt-4 text-xs opacity-60">post-mortem in progress…</p>
          </div>
        ) : (
          <>
            <p className="mt-6 text-center font-serif text-lg italic">
              "{card.verdict}"
            </p>

            <dl className="mt-6 space-y-2 text-sm">
              <Stat label="🚩 red flags raised"            value={card.redFlagsRaised} />
              <Stat label="🙈 red flags ignored"           value={card.redFlagsIgnored} />
              <Stat label="⚔️  war crimes mentioned"        value={card.warCrimesMentioned} />
              <Stat label="👩 times they brought up mom"   value={card.timesTheyBroughtUpTheirMother} />
              <div className="!mt-4 flex items-baseline justify-between border-t border-white/10 pt-3">
                <dt className="text-sm opacity-80">compatibility</dt>
                <dd className="text-2xl font-bold text-flame-400">
                  {card.compatibilityScore}%
                </dd>
              </div>
            </dl>

            <p className="mt-6 rounded-2xl border border-flame-500/30 bg-flame-500/10 p-3 text-center text-sm">
              {card.oneLinerForSharing}
            </p>
          </>
        )}
      </div>

      <div className="mt-5 flex gap-3">
        <button
          onClick={onRestart}
          className="rounded-full bg-flame-500 px-5 py-2 text-sm font-semibold hover:bg-flame-400"
        >
          back to the deck
        </button>
        <button
          onClick={() => {
            if (!card) return;
            navigator.clipboard.writeText(card.oneLinerForSharing);
          }}
          disabled={!card}
          className="rounded-full border border-white/20 px-5 py-2 text-sm hover:bg-white/10 disabled:opacity-40"
        >
          copy share line
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-baseline justify-between">
      <dt className="opacity-80">{label}</dt>
      <dd className="font-mono">{value}</dd>
    </div>
  );
}

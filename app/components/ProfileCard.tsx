"use client";

import type { Figure } from "@/src/types";

interface Props {
  figure: Figure;
  photoUrls: string[];
  /** Controlled by the parent (SwipeDeck) — taps are handled at the parent level. */
  photoIdx: number;
}

export function ProfileCard({ figure, photoUrls, photoIdx }: Props) {
  const photo = photoUrls[photoIdx];

  return (
    <div className="absolute inset-0 overflow-hidden rounded-[28px] bg-ink-800 shadow-card">
      <div className="relative h-full w-full">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo}
            alt={figure.photos[photoIdx]?.alt ?? figure.displayName}
            className="h-full w-full object-cover"
            draggable={false}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-flame-700/30 to-ink-900 text-flame-100">
            <span className="text-sm opacity-50">no photo baked</span>
          </div>
        )}

        {/* photo carousel dots */}
        <div className="pointer-events-none absolute inset-x-0 top-0 flex gap-1 p-3">
          {photoUrls.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition ${
                i === photoIdx ? "bg-white" : "bg-white/30"
              }`}
            />
          ))}
        </div>

        {/* info overlay — tap zones handled by parent SwipeDeck */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/70 to-transparent px-5 pb-6 pt-24 text-left">
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <h2 className="font-serif text-4xl leading-none tracking-tight">
                  {figure.displayName}
                </h2>
                <span className="text-2xl font-light leading-none opacity-70">
                  {figure.ageDisplay}
                </span>
              </div>
              <p className="mt-1.5 truncate text-sm opacity-80">
                {figure.occupation}
              </p>
              <p className="mt-0.5 truncate text-xs opacity-50">
                {figure.era} · {figure.distanceLine}
              </p>
            </div>
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/20 bg-white/10 text-base backdrop-blur-md">
              ⌃
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

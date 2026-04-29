"use client";

import { useEffect } from "react";
import type { Figure } from "@/src/types";

interface Props {
  figure: Figure;
  photoUrls: string[];
  onClose: () => void;
  onPass?: () => void;
  onInterested?: () => void;
  /** Hide the pass/match buttons (e.g. when viewing from within an existing chat). */
  hideActions?: boolean;
}

export function ProfileSheet({
  figure,
  photoUrls,
  onClose,
  onPass,
  onInterested,
  hideActions = false,
}: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fade-in fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-md sm:items-center">
      <div className="sheet-up relative flex h-[100dvh] w-full max-w-md flex-col overflow-hidden bg-ink-900 sm:my-8 sm:h-[min(92dvh,900px)] sm:rounded-3xl sm:shadow-card">
        {/* floating header */}
        <header className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between p-4">
          <button
            type="button"
            onClick={onClose}
            aria-label="close"
            className="grid h-10 w-10 place-items-center rounded-full bg-black/60 text-white backdrop-blur-md transition hover:bg-black/80"
          >
            ✕
          </button>
          <span className="rounded-full bg-black/60 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/80 backdrop-blur-md">
            {figure.era}
          </span>
        </header>

        <div className="no-scrollbar flex-1 overflow-y-auto pb-32">
          {/* hero photo — full bleed for impact */}
          <PhotoBlock src={photoUrls[0]} alt={figure.photos[0]?.alt ?? figure.displayName} hero />

          {/* identity */}
          <section className="px-6 pt-6">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <h1 className="font-serif text-[42px] leading-none tracking-tight">
                {figure.displayName}
              </h1>
              <span className="text-2xl font-light leading-none opacity-70">
                {figure.ageDisplay}
              </span>
              <span className="ml-1 inline-block rounded-full bg-flame-500 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                ✓ verified
              </span>
            </div>
            <p className="mt-2 text-[15px] leading-snug opacity-85">{figure.occupation}</p>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs opacity-55">
              <span>📏 {figure.heightDisplay}</span>
              <span>📍 {figure.distanceLine}</span>
            </div>
          </section>

          {/* badges */}
          <section className="px-6 pt-5">
            <div className="flex flex-wrap gap-1.5">
              {figure.badges.map((b) => (
                <span
                  key={b}
                  className="rounded-full border border-white/12 bg-white/[0.04] px-3 py-1.5 text-xs"
                >
                  {b}
                </span>
              ))}
            </div>
          </section>

          {/* bio */}
          <section className="px-6 pt-7">
            <p className="text-[10px] uppercase tracking-[0.2em] opacity-40">bio</p>
            <p className="mt-2 whitespace-pre-line text-[15px] leading-relaxed opacity-95">
              {figure.bio}
            </p>
          </section>

          <Divider />

          {/* alternating prompt + photo (Hinge-style) */}
          {figure.prompts.map((p, i) => (
            <div key={p.question}>
              <PromptBlock question={p.question} answer={p.answer} />
              {photoUrls[i + 1] && (
                <PhotoBlock
                  src={photoUrls[i + 1]!}
                  alt={figure.photos[i + 1]?.alt ?? figure.displayName}
                />
              )}
            </div>
          ))}

          <div className="px-6 pb-2 pt-7 text-center">
            <p className="text-[10px] uppercase tracking-[0.3em] opacity-25">
              joined Histinder · {figure.era}
            </p>
          </div>
        </div>

        {/* sticky action bar — hidden when viewing from inside an existing chat */}
        {!hideActions && onPass && onInterested && (
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-5 border-t border-white/5 bg-gradient-to-t from-ink-900 via-ink-900/96 to-transparent px-6 pt-7 pb-7">
            <button
              type="button"
              onClick={onPass}
              aria-label="pass"
              className="grid h-14 w-14 place-items-center rounded-full border border-white/20 bg-white/5 text-2xl backdrop-blur-md transition hover:scale-105 hover:border-white/40 hover:bg-white/10 active:scale-95"
            >
              ✕
            </button>
            <button
              type="button"
              onClick={onInterested}
              aria-label="interested"
              className="grid h-16 w-16 place-items-center rounded-full bg-flame-500 text-3xl text-white shadow-lg shadow-flame-500/30 transition hover:scale-105 hover:bg-flame-400 active:scale-95"
            >
              ♥
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function PhotoBlock({
  src,
  alt,
  hero,
}: {
  src: string | undefined;
  alt: string;
  hero?: boolean;
}) {
  if (!src) {
    return (
      <div
        className={`grid w-full place-items-center bg-gradient-to-br from-flame-700/30 to-ink-900 text-xs opacity-40 ${
          hero ? "aspect-[3/4]" : "aspect-[4/5] mx-6 rounded-2xl"
        }`}
      >
        no photo baked
      </div>
    );
  }
  if (hero) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={alt} className="aspect-[3/4] w-full object-cover" draggable={false} />
    );
  }
  return (
    <div className="px-6 pt-7">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className="aspect-[4/5] w-full rounded-2xl object-cover ring-1 ring-white/5"
        draggable={false}
      />
    </div>
  );
}

function PromptBlock({ question, answer }: { question: string; answer: string }) {
  return (
    <section className="px-6 pt-7">
      <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
        <p className="text-[11px] uppercase tracking-[0.18em] opacity-50">{question}</p>
        <p className="mt-2.5 font-serif text-[22px] leading-snug">{answer}</p>
      </div>
    </section>
  );
}

function Divider() {
  return (
    <div className="px-6 pt-8">
      <div className="h-px w-full bg-white/8" />
    </div>
  );
}

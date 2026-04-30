"use client";

import { useEffect, useMemo, useState } from "react";
import bakedPhotos from "@/data/baked-figures.json";

const PHOTOS = bakedPhotos as Record<string, string[]>;

interface Props {
  onSubmit: (bio: string) => void;
}

const PLACEHOLDER =
  "hi i'm Henry, 22, software engineer in SF. i bike, brew way too much coffee, and read sci-fi. looking for a gentle disaster.";

const HINTS = [
  "your name + age",
  "what you do",
  "two or three things you're into",
  "what you're looking for (or not)",
];

const TAGLINES = [
  "Would Genghis Khan swipe right on you?",
  "Would Cleopatra leave you on read?",
  "Would Napoleon say you're his type, or too tall?",
  "Would Joan of Arc call you divinely mid?",
  "Would Caesar risk the Senate for you?",
  "Would Marie Antoinette let you eat cake with her?",
  "Would Alexander the Great conquer your DMs?",
  "Would Shakespeare write you a sonnet or ghost you?",
  "Would Abe Lincoln think you passed the vibe check?",
  "Would Darwin say you're naturally selected?",
];

export function BioInput({ onSubmit }: Props) {
  const [bio, setBio] = useState("");
  const tooShort = bio.trim().length < 10;

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden">
      <PhotoWaterfall />

      <div className="relative z-10 mx-auto flex h-full w-full max-w-md flex-col px-5 py-8 sm:px-6 sm:py-10">
        <div className="flex flex-1 flex-col justify-center">
          <div className="rounded-3xl border border-white/10 bg-ink-900/75 p-6 shadow-card backdrop-blur-xl sm:p-7">
            <h1 className="font-serif text-5xl tracking-tight sm:text-6xl">
              <span className="text-flame-500">Hist</span>inder
            </h1>
            <p className="mt-2 text-sm opacity-60">dating, but historically</p>

            <CyclingTagline />

            <div className="mt-7 sm:mt-8">
              <label className="block text-xs uppercase tracking-[0.2em] opacity-60">
                who are you?
              </label>
              <p className="mt-2 text-sm leading-relaxed opacity-80">
                tell us a little about yourself — they'll all see it before
                they message you. the more specific, the better the chats.
              </p>

              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder={PLACEHOLDER}
                rows={5}
                className="mt-4 w-full resize-none rounded-2xl border border-white/15 bg-ink-900/80 p-4 text-sm leading-relaxed outline-none ring-flame-500/40 backdrop-blur transition placeholder:opacity-30 focus:border-flame-500/60 focus:ring-2"
                autoFocus
              />

              <ul className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] opacity-60">
                {HINTS.map((h) => (
                  <li key={h} className="flex items-center gap-1.5">
                    <span className="text-flame-400">·</span> {h}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onSubmit(bio.trim())}
          disabled={tooShort}
          className="w-full rounded-full bg-flame-500 py-4 text-sm font-semibold uppercase tracking-[0.2em] shadow-lg shadow-flame-500/30 transition hover:bg-flame-400 disabled:cursor-not-allowed disabled:opacity-30"
        >
          find me a date
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Background: 4 layered columns of figure photos. Outer columns are visible
// on every screen (mobile included). Inner columns appear on tablet+ for a
// parallax depth effect. Different speeds + directions per column. Brick
// offset on alternating photos. Infinite seamless loop.
// ─────────────────────────────────────────────────────────────────────────────

interface ColumnConfig {
  photos: string[];
  side: "left" | "right";
  position: "outer" | "inner";
  direction: "up" | "down";
  durationS: number;
  opacity: number;
}

function PhotoWaterfall() {
  const layers = useMemo<ColumnConfig[]>(() => {
    const all: string[] = [];
    for (const photos of Object.values(PHOTOS)) {
      for (const url of photos) {
        if (url) all.push(url);
      }
    }
    if (all.length === 0) return [];

    // Distribute photos across 4 columns by index modulo so each column gets
    // a varied mix instead of one figure's whole roster clustered together.
    const buckets: string[][] = [[], [], [], []];
    all.forEach((url, i) => buckets[i % 4]!.push(url));

    return [
      { photos: buckets[0]!, side: "left",  position: "outer", direction: "down", durationS: 200, opacity: 0.55 },
      { photos: buckets[1]!, side: "left",  position: "inner", direction: "up",   durationS: 320, opacity: 0.30 },
      { photos: buckets[2]!, side: "right", position: "inner", direction: "down", durationS: 320, opacity: 0.30 },
      { photos: buckets[3]!, side: "right", position: "outer", direction: "up",   durationS: 200, opacity: 0.55 },
    ];
  }, []);

  if (layers.length === 0) return null;

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden="true"
    >
      {layers.map((layer, i) => (
        <Column key={i} {...layer} />
      ))}

      {/* center vignette so the form stays legible */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-ink-900/85 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-b from-ink-900/30 via-transparent to-ink-900/50" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Cycling tagline: rotates through the "Would X swipe right on you?" questions
// every ~3.5s with a soft cross-fade. Min-height locked so the layout doesn't
// jump when the wrapped line count changes.
// ─────────────────────────────────────────────────────────────────────────────
function CyclingTagline() {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIdx((i) => (i + 1) % TAGLINES.length);
    }, 3500);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative mt-6 min-h-[3.6em] sm:min-h-[3em]">
      {TAGLINES.map((line, i) => (
        <p
          key={i}
          className="absolute inset-0 font-serif text-[19px] leading-snug tracking-tight text-white/85 transition-opacity duration-700 ease-out sm:text-[21px]"
          style={{
            opacity: i === idx ? 1 : 0,
            transitionDelay: i === idx ? "120ms" : "0ms",
          }}
        >
          <span className="text-flame-400">›</span> {line}
        </p>
      ))}
    </div>
  );
}

function Column({
  photos,
  side,
  position,
  direction,
  durationS,
  opacity,
}: ColumnConfig) {
  // Duplicate the list so the keyframes' 50% translate lands exactly where the
  // matching frame begins — seamless infinite loop.
  const doubled = [...photos, ...photos];

  // Outer columns visible on mobile; inner columns only show on md+.
  const widthClass =
    position === "outer"
      ? "w-[88px] sm:w-[120px] md:w-[180px] lg:w-[220px] xl:w-[260px]"
      : "hidden md:block md:w-[150px] lg:w-[190px] xl:w-[220px]";

  // Inner columns slot just inboard of the outer column. Their offset has to
  // match the outer column's width at each breakpoint.
  const positionClass = (() => {
    if (position === "outer") {
      return side === "left" ? "left-0" : "right-0";
    }
    return side === "left"
      ? "md:left-[180px] lg:left-[220px] xl:left-[260px]"
      : "md:right-[180px] lg:right-[220px] xl:right-[260px]";
  })();

  const animationClass =
    direction === "down" ? "waterfall-down" : "waterfall-up";

  const fadeMask =
    "linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%)";

  return (
    <div
      className={`absolute top-0 bottom-0 overflow-hidden ${widthClass} ${positionClass}`}
      style={{
        WebkitMaskImage: fadeMask,
        maskImage: fadeMask,
      }}
    >
      <div
        className={`flex flex-col gap-3 px-1.5 will-change-transform ${animationClass}`}
        style={{ animationDuration: `${durationS}s` }}
      >
        {doubled.map((url, i) => {
          const brick = i % 2 === 0 ? 0 : side === "left" ? 12 : -12;
          return (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={`${i}-${url}`}
              src={url}
              alt=""
              draggable={false}
              loading="lazy"
              className="w-full rounded-2xl object-cover shadow-2xl shadow-black/60"
              style={{
                aspectRatio: "3 / 4",
                opacity,
                transform: `translateX(${brick}px)`,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

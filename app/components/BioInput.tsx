"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import bakedPhotos from "@/data/baked-figures.json";
import {
  type FormState,
  EMPTY_FORM,
  GENDERS,
  isFormReady,
} from "@/src/bio";

const PHOTOS = bakedPhotos as Record<string, string[]>;

interface Props {
  onSubmit: (form: FormState) => void;
  /** If provided, the form prefills with these values (edit mode). */
  initial?: FormState;
  /** Override the bottom button label. Defaults to "find me a date". */
  submitLabel?: string;
  /** Optional secondary action — used for cancel/back when editing. */
  onCancel?: () => void;
  /** Hide the cycling tagline + fun fact (used in edit mode). */
  minimal?: boolean;
}


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

export function BioInput({
  onSubmit,
  initial,
  submitLabel,
  onCancel,
  minimal,
}: Props) {
  const [form, setForm] = useState<FormState>(initial ?? EMPTY_FORM);

  const isReady = isFormReady(form);

  function update<K extends keyof FormState>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit() {
    if (!isReady) return;
    onSubmit(form);
  }

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden">
      {!minimal && <PhotoWaterfall />}

      <div className="relative z-10 mx-auto flex h-full w-full max-w-md flex-col">
        <div className="no-scrollbar flex-1 overflow-y-auto px-5 pt-8 pb-4 sm:px-6 sm:pt-10">
          <div className="rounded-3xl border border-white/10 bg-ink-900/80 p-6 shadow-card backdrop-blur-xl sm:p-7">
            {!minimal ? (
              <>
                <h1 className="font-serif text-5xl tracking-tight sm:text-6xl">
                  <span className="text-flame-500">Hist</span>inder
                </h1>
                <p className="mt-2 text-sm opacity-60">dating, but historically</p>

                <CyclingTagline />
              </>
            ) : (
              <header className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.25em] opacity-50">
                    profile
                  </p>
                  <h1 className="mt-1 font-serif text-3xl tracking-tight">
                    your info
                  </h1>
                </div>
                {onCancel && (
                  <button
                    type="button"
                    onClick={onCancel}
                    className="text-xs uppercase tracking-[0.18em] opacity-60 hover:opacity-100"
                  >
                    cancel
                  </button>
                )}
              </header>
            )}

            <div className="mt-7 space-y-5 sm:mt-8">
              <Field label="Name" required>
                <TextInput
                  value={form.name}
                  onChange={(v) => update("name", v)}
                  placeholder="Henry"
                  autoFocus
                />
              </Field>

              <div className="grid grid-cols-[1fr_1fr] gap-3">
                <Field label="Age" required>
                  <TextInput
                    value={form.age}
                    onChange={(v) => update("age", v)}
                    placeholder="22"
                    inputMode="numeric"
                  />
                </Field>
                <Field label="Height">
                  <TextInput
                    value={form.height}
                    onChange={(v) => update("height", v)}
                    placeholder="5'10"
                  />
                </Field>
              </div>

              <Field label="Gender" required>
                <div className="flex flex-wrap gap-2">
                  {GENDERS.map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => update("gender", g)}
                      className={`rounded-full border px-3 py-1.5 text-xs transition ${
                        form.gender === g
                          ? "border-flame-500 bg-flame-500/20 text-flame-100"
                          : "border-white/15 bg-white/5 text-white/80 hover:border-white/30 hover:bg-white/10"
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="What you do" required>
                <TextInput
                  value={form.occupation}
                  onChange={(v) => update("occupation", v)}
                  placeholder="software engineer in SF"
                />
              </Field>

              <Field label="Hobbies & interests">
                <TextInput
                  value={form.hobbies}
                  onChange={(v) => update("hobbies", v)}
                  placeholder="biking, sci-fi, brewing way too much coffee"
                />
              </Field>

              <Field label="What you're looking for">
                <TextInput
                  value={form.lookingFor}
                  onChange={(v) => update("lookingFor", v)}
                  placeholder="a gentle disaster"
                />
              </Field>

              <Field label="A fun fact about you">
                <TextInput
                  value={form.funFact}
                  onChange={(v) => update("funFact", v)}
                  placeholder="i can recite Hamlet's soliloquy backwards"
                />
              </Field>

              <p className="text-[11px] opacity-50">
                <span className="text-flame-400">•</span> required to start
                matching
              </p>
            </div>
          </div>
        </div>

        <div
          className="border-t border-white/8 bg-ink-900/85 px-5 py-4 backdrop-blur-md sm:px-6 sm:py-5"
          style={{
            paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)",
          }}
        >
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!isReady}
            className="w-full rounded-full bg-flame-500 py-4 text-sm font-semibold uppercase tracking-[0.2em] shadow-lg shadow-flame-500/30 transition hover:bg-flame-400 disabled:cursor-not-allowed disabled:opacity-30"
          >
            {submitLabel ?? "find me a date"}
          </button>
        </div>
      </div>
    </div>
  );
}


function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/55">
        <span>{label}</span>
        {required && <span className="text-flame-500">•</span>}
      </label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
  autoFocus,
  inputMode,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      autoFocus={autoFocus}
      inputMode={inputMode}
      className="w-full rounded-xl border border-white/12 bg-ink-900/80 px-3.5 py-2.5 text-[15px] outline-none ring-flame-500/40 backdrop-blur transition placeholder:opacity-30 focus:border-flame-500/60 focus:ring-2"
    />
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
    // Only use ONE photo per figure on the homepage (the main portrait, photo
    // 0). 27 unique faces is plenty of variety for the waterfall, vs. loading
    // 108 multi-megabyte source images.
    const all: string[] = [];
    for (const photos of Object.values(PHOTOS)) {
      const first = photos[0];
      if (first) all.push(first);
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
            <div
              key={`${i}-${url}`}
              className="relative w-full overflow-hidden rounded-2xl shadow-2xl shadow-black/60"
              style={{
                aspectRatio: "3 / 4",
                opacity,
                transform: `translateX(${brick}px)`,
              }}
            >
              <Image
                src={url}
                alt=""
                fill
                sizes="(max-width: 640px) 100px, (max-width: 768px) 130px, (max-width: 1024px) 200px, 240px"
                quality={45}
                draggable={false}
                className="object-cover"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

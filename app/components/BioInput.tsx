"use client";

import { useState } from "react";

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

export function BioInput({ onSubmit }: Props) {
  const [bio, setBio] = useState("");
  const tooShort = bio.trim().length < 10;

  return (
    <div className="mx-auto flex h-[100dvh] w-full max-w-md flex-col px-6 py-10">
      <div className="flex flex-1 flex-col justify-center">
        <h1 className="font-serif text-6xl tracking-tight">
          <span className="text-flame-500">Hist</span>inder
        </h1>
        <p className="mt-2 text-sm opacity-60">dating, but historically</p>

        <div className="mt-12">
          <label className="block text-xs uppercase tracking-[0.2em] opacity-60">
            who are you?
          </label>
          <p className="mt-2 text-sm leading-relaxed opacity-80">
            tell us a little about yourself — they'll all see it before they
            message you. the more specific, the better the chats.
          </p>

          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder={PLACEHOLDER}
            rows={5}
            className="mt-4 w-full resize-none rounded-2xl border border-white/10 bg-white/5 p-4 text-sm leading-relaxed outline-none ring-flame-500/40 transition placeholder:opacity-30 focus:border-flame-500/60 focus:ring-2"
            autoFocus
          />

          <ul className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] opacity-50">
            {HINTS.map((h) => (
              <li key={h} className="flex items-center gap-1.5">
                <span className="text-flame-400">·</span> {h}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onSubmit(bio.trim())}
        disabled={tooShort}
        className="w-full rounded-full bg-flame-500 py-4 text-sm font-semibold uppercase tracking-[0.2em] transition hover:bg-flame-400 disabled:cursor-not-allowed disabled:opacity-30"
      >
        find me a date
      </button>

    </div>
  );
}

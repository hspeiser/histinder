"use client";

import { useEffect } from "react";
import type { Figure } from "@/src/types";

export interface ToastItem {
  id: string;
  figureId: string;
  kind: "match" | "rejection";
}

interface Props {
  toasts: ToastItem[];
  figuresById: Record<string, Figure>;
  photosByFigure: Record<string, string[]>;
  onOpen: (toast: ToastItem) => void;
  onDismiss: (id: string) => void;
}

export function ToastStack({ toasts, figuresById, photosByFigure, onOpen, onDismiss }: Props) {
  if (toasts.length === 0) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-40 flex flex-col items-center gap-2 px-3 sm:items-end sm:pr-4">
      {toasts.map((t) => (
        <Toast
          key={t.id}
          toast={t}
          figure={figuresById[t.figureId]}
          photoUrl={photosByFigure[t.figureId]?.[0]}
          onOpen={() => onOpen(t)}
          onDismiss={() => onDismiss(t.id)}
        />
      ))}
    </div>
  );
}

function Toast({
  toast,
  figure,
  photoUrl,
  onOpen,
  onDismiss,
}: {
  toast: ToastItem;
  figure: Figure | undefined;
  photoUrl: string | undefined;
  onOpen: () => void;
  onDismiss: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 6500);
    return () => clearTimeout(t);
  }, [onDismiss]);

  if (!figure) return null;

  const isMatch = toast.kind === "match";

  return (
    <div className="slide-in-right pointer-events-auto w-full max-w-xs">
      <button
        type="button"
        onClick={onOpen}
        className={`flex w-full items-center gap-3 rounded-2xl border bg-ink-800/95 px-3 py-3 text-left shadow-card backdrop-blur-md transition hover:bg-ink-700 ${
          isMatch ? "border-flame-500/50" : "border-white/10"
        }`}
      >
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoUrl}
            alt={figure.displayName}
            className={`h-11 w-11 shrink-0 rounded-full object-cover ${
              isMatch ? "ring-2 ring-flame-500/60" : "grayscale"
            }`}
          />
        ) : (
          <div className="h-11 w-11 shrink-0 rounded-full bg-white/10" />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[10px] font-semibold uppercase tracking-[0.18em] text-flame-400">
            {isMatch ? "it's a match" : "they passed"}
          </p>
          <p className="truncate text-sm font-semibold">{figure.displayName}</p>
          <p className="truncate text-xs opacity-60">
            {isMatch ? "they sent you a message" : "tap to read"}
          </p>
        </div>
        <span
          role="button"
          tabIndex={0}
          aria-label="dismiss"
          onClick={(e) => {
            e.stopPropagation();
            onDismiss();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.stopPropagation();
              onDismiss();
            }
          }}
          className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-sm opacity-50 transition hover:bg-white/10 hover:opacity-100"
        >
          ✕
        </span>
      </button>
    </div>
  );
}

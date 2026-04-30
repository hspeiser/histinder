"use client";

import { useEffect, useRef, useState } from "react";
import type { Figure } from "@/src/types";
import { ProfileCard } from "./ProfileCard";
import { ProfileSheet } from "./ProfileSheet";

interface Props {
  /**
   * Already filtered by the parent (it removes swiped IDs). The SwipeDeck does
   * NOT track its own index — `figures[0]` is always the top card. After a
   * commit, the parent removes the figure from its source list, this prop
   * shrinks, and `figures[0]` becomes the next person.
   */
  figures: Figure[];
  photosByFigure: Record<string, string[]>;
  onInterested: (figure: Figure) => void;
  onPass: (figure: Figure) => void;
}

const SWIPE_THRESHOLD = 120;
const TAP_THRESHOLD = 8;
const COMMIT_MS = 280;
const SNAP_MS = 220;

export function SwipeDeck({ figures, photosByFigure, onInterested, onPass }: Props) {
  const [photoIdx, setPhotoIdx] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [committing, setCommitting] = useState(false);

  const cardRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({ active: false, startX: 0, startY: 0, dx: 0, dy: 0 });

  const top = figures[0];
  const next = figures[1];
  const topId = top?.id;
  const photoCount = top?.photos.length ?? 0;

  // Reset photo carousel whenever the top figure changes.
  useEffect(() => {
    setPhotoIdx(0);
  }, [topId]);

  // ── direct-DOM helpers (no React re-render during drag) ────────────────────

  function applyDragStyle(dx: number, dy: number) {
    const card = cardRef.current;
    if (!card) return;
    card.style.transform = `translate(${dx}px, ${dy}px) rotate(${dx * 0.06}deg)`;
    card.style.opacity = String(1 - Math.min(0.4, Math.abs(dx) / 320));
    card.style.setProperty("--stamp-match", String(Math.max(0, dx / SWIPE_THRESHOLD)));
    card.style.setProperty("--stamp-pass", String(Math.max(0, -dx / SWIPE_THRESHOLD)));
  }

  function snapBack() {
    const card = cardRef.current;
    if (!card) return;
    card.style.transition = `transform ${SNAP_MS}ms cubic-bezier(0.22, 1, 0.36, 1), opacity ${SNAP_MS}ms`;
    card.style.transform = "translate(0,0) rotate(0deg)";
    card.style.opacity = "1";
    card.style.setProperty("--stamp-match", "0");
    card.style.setProperty("--stamp-pass", "0");
  }

  function commitSwipe(direction: "left" | "right") {
    const card = cardRef.current;
    if (!card || !top || committing) return;
    setCommitting(true);
    card.style.transition = `transform ${COMMIT_MS}ms cubic-bezier(0.4, 0, 0.2, 1), opacity ${COMMIT_MS}ms`;
    const x = direction === "right" ? 700 : -700;
    const rot = direction === "right" ? 24 : -24;
    card.style.transform = `translate(${x}px, 40px) rotate(${rot}deg)`;
    card.style.opacity = "0";
    card.style.setProperty("--stamp-match", direction === "right" ? "1" : "0");
    card.style.setProperty("--stamp-pass", direction === "left" ? "1" : "0");

    const figure = top;
    setTimeout(() => {
      // Reset the card styles BEFORE telling the parent to advance, so by the
      // time React re-renders with the new top figure the DOM node is at
      // center and visible. Avoids the "next-card flashes off-screen" artifact.
      card.style.transition = "none";
      card.style.transform = "translate(0,0) rotate(0deg)";
      card.style.opacity = "1";
      card.style.setProperty("--stamp-match", "0");
      card.style.setProperty("--stamp-pass", "0");
      // Force a layout flush so the reset paints before the new figure renders.
      void card.offsetHeight;

      if (direction === "right") onInterested(figure);
      else onPass(figure);
      setCommitting(false);
    }, COMMIT_MS);
  }

  // ── pointer + tap handling ──────────────────────────────────────────────────

  function onPointerDown(e: React.PointerEvent) {
    if (!top || committing) return;
    const card = cardRef.current;
    if (!card) return;
    card.setPointerCapture(e.pointerId);
    card.style.transition = "none";
    dragRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      dx: 0,
      dy: 0,
    };
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragRef.current.active) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    dragRef.current.dx = dx;
    dragRef.current.dy = dy;
    applyDragStyle(dx, dy);
  }

  function onPointerUp(e: React.PointerEvent) {
    if (!dragRef.current.active) return;
    const { dx } = dragRef.current;
    dragRef.current.active = false;

    if (Math.abs(dx) > SWIPE_THRESHOLD) {
      commitSwipe(dx > 0 ? "right" : "left");
    } else if (Math.abs(dx) < TAP_THRESHOLD) {
      handleTap(e);
      snapBack();
    } else {
      snapBack();
    }
  }

  function onPointerCancel() {
    if (!dragRef.current.active) return;
    dragRef.current.active = false;
    snapBack();
  }

  function handleTap(e: React.PointerEvent) {
    const card = cardRef.current;
    if (!card || !top) return;
    const rect = card.getBoundingClientRect();
    const relY = e.clientY - rect.top;
    const relX = e.clientX - rect.left;

    if (relY > rect.height * 0.7) {
      setExpanded(true);
      return;
    }
    if (relX < rect.width / 3) {
      setPhotoIdx((i) => Math.max(0, i - 1));
    } else {
      setPhotoIdx((i) => Math.min(photoCount - 1, i + 1));
    }
  }

  // ── render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full w-full flex-col">
      {/* Card area — flex-1 so the card stretches to use available height
          on mobile (where 640px is too tall), capped at 680px on big screens. */}
      <div className="relative mx-auto mt-2 min-h-0 w-[380px] max-w-full flex-1 sm:max-h-[680px]">
        {next && photosByFigure[next.id] && (
          <div
            className="pointer-events-none absolute inset-0"
            style={{ transform: "scale(0.95) translateY(8px)", opacity: 0.45 }}
          >
            <ProfileCard figure={next} photoUrls={photosByFigure[next.id]!} photoIdx={0} />
          </div>
        )}

        {top && photosByFigure[top.id] ? (
          <div
            ref={cardRef}
            className="absolute inset-0 select-none"
            style={{
              touchAction: "none",
              willChange: "transform, opacity",
              ["--stamp-match" as never]: 0,
              ["--stamp-pass" as never]: 0,
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerCancel}
          >
            <ProfileCard
              figure={top}
              photoUrls={photosByFigure[top.id]!}
              photoIdx={photoIdx}
            />
            <Stamp side="left"  label="INTERESTED" tone="match" />
            <Stamp side="right" label="PASS"       tone="pass" />
          </div>
        ) : !top ? (
          <div className="flex h-full items-center justify-center rounded-[28px] border border-white/10 bg-ink-800 px-8 text-center text-sm opacity-70">
            you've seen everyone in this century. check your inbox.
          </div>
        ) : null}
      </div>

      {/* Action bar — hugs the bottom of the deck section. */}
      <div className="flex shrink-0 items-center justify-center gap-6 pb-3 pt-4 sm:pt-5 sm:pb-4">
        <ActionButton
          onClick={() => commitSwipe("left")}
          disabled={!top || committing}
          aria-label="pass"
          variant="pass"
        >
          ✕
        </ActionButton>
        <ActionButton
          onClick={() => top && setExpanded(true)}
          disabled={!top}
          aria-label="see full profile"
          variant="info"
        >
          ⓘ
        </ActionButton>
        <ActionButton
          onClick={() => commitSwipe("right")}
          disabled={!top || committing}
          aria-label="interested"
          variant="match"
        >
          ♥
        </ActionButton>
      </div>

      {top && expanded && photosByFigure[top.id] && (
        <ProfileSheet
          figure={top}
          photoUrls={photosByFigure[top.id]!}
          onClose={() => setExpanded(false)}
          onPass={() => {
            setExpanded(false);
            commitSwipe("left");
          }}
          onInterested={() => {
            setExpanded(false);
            commitSwipe("right");
          }}
        />
      )}
    </div>
  );
}

function Stamp({
  side,
  label,
  tone,
}: {
  side: "left" | "right";
  label: string;
  tone: "match" | "pass";
}) {
  const positionClass =
    side === "left" ? "left-6 top-10 -rotate-12" : "right-6 top-10 rotate-12";
  const colorClass =
    tone === "match" ? "border-flame-500 text-flame-500" : "border-white/80 text-white/90";
  const varName = tone === "match" ? "--stamp-match" : "--stamp-pass";
  return (
    <div
      className={`pointer-events-none absolute ${positionClass} rounded-md border-4 ${colorClass} px-3 py-1 text-2xl font-black tracking-[0.2em]`}
      style={{ opacity: `var(${varName})` }}
    >
      {label}
    </div>
  );
}

function ActionButton({
  children,
  onClick,
  disabled,
  variant,
  ...rest
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant: "pass" | "match" | "info";
} & React.AriaAttributes) {
  const sizeClass = variant === "match" ? "h-16 w-16 text-3xl" : "h-12 w-12 text-xl";
  const styleClass =
    variant === "match"
      ? "bg-flame-500 text-white shadow-lg shadow-flame-500/30 hover:bg-flame-400"
      : variant === "pass"
        ? "border border-white/20 bg-white/5 text-white hover:border-white/40 hover:bg-white/10"
        : "border border-white/10 bg-white/[0.04] text-white/70 hover:border-white/30 hover:text-white";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`grid place-items-center rounded-full transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-30 ${sizeClass} ${styleClass}`}
      {...rest}
    >
      {children}
    </button>
  );
}

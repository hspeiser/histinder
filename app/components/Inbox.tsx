"use client";

import type { Figure, Inbox as InboxT, InboxEntry } from "@/src/types";

interface Props {
  inbox: InboxT;
  figuresById: Record<string, Figure>;
  photosByFigure: Record<string, string[]>;
  onOpen: (figureId: string) => void;
}

export function Inbox({ inbox, figuresById, photosByFigure, onOpen }: Props) {
  const entries = Object.values(inbox).sort(
    (a, b) => sortKey(b) - sortKey(a),
  );

  if (entries.length === 0) {
    return (
      <div className="mx-auto flex h-full max-w-md flex-col items-center justify-center px-6 text-center">
        <p className="font-serif text-3xl tracking-tight opacity-50">
          inbox empty
        </p>
        <p className="mt-3 max-w-xs text-sm opacity-50">
          swipe right on someone in the deck. they may match. they may not.
        </p>
      </div>
    );
  }

  // Split: matches first (with unread badge), then rejections.
  const matches = entries.filter((e): e is Extract<InboxEntry, { kind: "match" }> => e.kind === "match");
  const rejections = entries.filter((e): e is Extract<InboxEntry, { kind: "rejection" }> => e.kind === "rejection");

  return (
    <div className="mx-auto h-full w-full max-w-md overflow-y-auto px-3 py-2">
      {matches.length > 0 && (
        <Section title="matches">
          {matches.map((entry) => (
            <MatchRow
              key={entry.figureId}
              entry={entry}
              figure={figuresById[entry.figureId]!}
              photoUrl={photosByFigure[entry.figureId]?.[0]}
              onOpen={() => onOpen(entry.figureId)}
            />
          ))}
        </Section>
      )}

      {rejections.length > 0 && (
        <Section title="they're not interested">
          {rejections.map((entry) => (
            <RejectionRow
              key={entry.figureId}
              entry={entry}
              figure={figuresById[entry.figureId]!}
              photoUrl={photosByFigure[entry.figureId]?.[0]}
              onOpen={() => onOpen(entry.figureId)}
            />
          ))}
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-2">
      <p className="px-3 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-[0.2em] opacity-50">
        {title}
      </p>
      <div className="space-y-1">{children}</div>
    </section>
  );
}

function MatchRow({
  entry,
  figure,
  photoUrl,
  onOpen,
}: {
  entry: Extract<InboxEntry, { kind: "match" }>;
  figure: Figure;
  photoUrl?: string;
  onOpen: () => void;
}) {
  const last = entry.messages[entry.messages.length - 1];
  const preview = last
    ? `${last.role === "user" ? "you: " : ""}${last.content}`
    : `${figure.displayName} matched with you`;

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition hover:bg-white/5 ${
        entry.ended ? "opacity-70" : ""
      }`}
    >
      <Avatar src={photoUrl} alt={figure.displayName} muted={entry.ended} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="flex min-w-0 items-center gap-1.5 truncate font-semibold">
            <span className="truncate">{figure.displayName}</span>
            {entry.ended && (
              <span className="shrink-0 rounded-full bg-flame-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-flame-400">
                unmatched
              </span>
            )}
          </p>
          <span className="shrink-0 text-[10px] uppercase tracking-wider opacity-40">
            {relativeTime(entry.matchedAt)}
          </span>
        </div>
        <p className={`truncate text-sm ${entry.unread ? "font-semibold text-white" : "opacity-70"}`}>
          {preview}
        </p>
      </div>
      {entry.unread && <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-flame-500" />}
    </button>
  );
}

function RejectionRow({
  entry,
  figure,
  photoUrl,
  onOpen,
}: {
  entry: Extract<InboxEntry, { kind: "rejection" }>;
  figure: Figure;
  photoUrl?: string;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left opacity-80 transition hover:bg-white/5 hover:opacity-100"
    >
      <Avatar src={photoUrl} alt={figure.displayName} muted />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate font-semibold">{figure.displayName}</p>
          <span className="shrink-0 text-[10px] uppercase tracking-wider opacity-40">
            {relativeTime(entry.rejectedAt)}
          </span>
        </div>
        <p className={`truncate text-sm italic ${entry.read ? "opacity-50" : "opacity-90"}`}>
          {entry.rejectionMessage}
        </p>
      </div>
      {!entry.read && <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-white/40" />}
    </button>
  );
}

function Avatar({
  src,
  alt,
  muted,
}: {
  src?: string;
  alt: string;
  muted?: boolean;
}) {
  return (
    <div
      className={`relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-white/10 ${
        muted ? "grayscale" : ""
      }`}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} className="h-full w-full object-cover" />
      ) : null}
    </div>
  );
}

function sortKey(e: InboxEntry): number {
  return e.kind === "match" ? e.matchedAt : e.rejectedAt;
}

function relativeTime(t: number): string {
  const diff = Date.now() - t;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const d = Math.floor(hr / 24);
  return `${d}d`;
}

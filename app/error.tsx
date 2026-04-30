"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[histinder] runtime error:", error);
  }, [error]);

  return (
    <div className="mx-auto flex h-[100dvh] w-full max-w-md flex-col items-center justify-center gap-5 px-6 text-center">
      <p className="font-serif text-5xl tracking-tight text-flame-500">
        well, that broke.
      </p>
      <p className="text-sm opacity-70">
        something went wrong. it might just be a bad reload.
      </p>
      {error.message && (
        <p className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left text-xs opacity-60">
          {error.message}
        </p>
      )}
      <div className="mt-2 flex flex-col gap-2">
        <button
          type="button"
          onClick={reset}
          className="rounded-full bg-flame-500 px-5 py-2.5 text-sm font-semibold uppercase tracking-[0.18em] hover:bg-flame-400"
        >
          try again
        </button>
        <button
          type="button"
          onClick={() => {
            try {
              localStorage.removeItem("histinder-state-v4");
              localStorage.removeItem("histinder-state-v3");
              localStorage.removeItem("histinder-state-v2");
            } catch {}
            window.location.reload();
          }}
          className="text-[10px] uppercase tracking-[0.2em] opacity-50 hover:opacity-100"
        >
          reset all data and reload
        </button>
      </div>
    </div>
  );
}

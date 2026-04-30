// ─────────────────────────────────────────────────────────────────────────────
// Server-only chat logging via Supabase. Best-effort — logging failures must
// never crash the chat experience.
// ─────────────────────────────────────────────────────────────────────────────

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";

let _client: SupabaseClient | null = null;
function getSupabase(): SupabaseClient | null {
  if (_client) return _client;
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  _client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _client;
}

const COOKIE_NAME = "histinder_uid";

/** Returns the user's ID — auth user if a valid Bearer token is present, else
 *  the anonymous cookie UUID, else null. Best-effort. */
export async function getUserIdFromRequest(
  req: NextRequest,
): Promise<string | null> {
  // Try Bearer token first.
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) {
    const token = auth.slice(7);
    const sb = getSupabase();
    if (sb) {
      try {
        const { data, error } = await sb.auth.getUser(token);
        if (!error && data.user) return data.user.id;
      } catch {
        // fall through
      }
    }
  }
  const v = req.cookies.get(COOKIE_NAME)?.value;
  if (v && /^[a-f0-9-]{20,}$/i.test(v)) return v;
  return null;
}

export type ChatRole = "user" | "figure";
export type ChatKind = "opener" | "message" | "rejection" | "end";

export interface ChatLogRow {
  user_id: string;
  figure_id: string;
  role: ChatRole;
  kind?: ChatKind;
  content: string;
}

export async function logChat(rows: ChatLogRow[]): Promise<void> {
  if (rows.length === 0) return;
  const sb = getSupabase();
  if (!sb) return;
  try {
    await sb.from("histinder_chat_messages").insert(
      rows.map((r) => ({
        user_id: r.user_id,
        figure_id: r.figure_id,
        role: r.role,
        kind: r.kind ?? "message",
        content: r.content,
      })),
    );
  } catch {
    // intentionally silent — logging is fire-and-forget
  }
}

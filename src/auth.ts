// ─────────────────────────────────────────────────────────────────────────────
// Server-side auth + user resolution. Routes call resolveUserId(req) to get
// the user's identifier — either their authenticated Supabase auth id (if a
// valid Bearer token is present) or their anonymous cookie UUID (created if
// missing). Use setUidCookie on the response for "new" cookies.
// ─────────────────────────────────────────────────────────────────────────────

import type { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import crypto from "node:crypto";

const COOKIE_NAME = "histinder_uid";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

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

export interface ResolvedUser {
  id: string;
  isNew: boolean;       // cookie was just minted
  isAuth: boolean;      // signed-in supabase user
  cookieId: string | null; // raw cookie value if any (useful for migration)
}

function readCookieId(req: NextRequest): string | null {
  const v = req.cookies.get(COOKIE_NAME)?.value;
  if (v && /^[a-f0-9-]{20,}$/i.test(v)) return v;
  return null;
}

export async function resolveUserId(req: NextRequest): Promise<ResolvedUser> {
  const cookieId = readCookieId(req);

  // Try auth header first
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) {
    const token = auth.slice(7);
    const sb = getSupabase();
    if (sb) {
      try {
        const { data, error } = await sb.auth.getUser(token);
        if (!error && data.user) {
          return {
            id: data.user.id,
            isNew: false,
            isAuth: true,
            cookieId,
          };
        }
      } catch {
        // fall through to cookie
      }
    }
  }

  if (cookieId) {
    return { id: cookieId, isNew: false, isAuth: false, cookieId };
  }

  return {
    id: crypto.randomUUID(),
    isNew: true,
    isAuth: false,
    cookieId: null,
  };
}

export function setUidCookie(res: NextResponse, id: string) {
  res.cookies.set({
    name: COOKIE_NAME,
    value: id,
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: ONE_YEAR_SECONDS,
    path: "/",
  });
}

import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COOKIE_NAME = "histinder_uid";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;
const TABLE = "histinder_state";

// ─────────────────────────────────────────────────────────────────────────────
// Lazy Supabase client. We use the service-role key on the server (it bypasses
// RLS, which is fine because we authenticate users via our own httpOnly cookie
// and never expose this client to the browser). Falls back to anon key if
// service role isn't set, but anon-only setups need RLS policies of their own.
// ─────────────────────────────────────────────────────────────────────────────
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
    global: { headers: { "x-application": "histinder" } },
  });
  return _client;
}

function getOrCreateUserId(req: NextRequest): { id: string; isNew: boolean } {
  const existing = req.cookies.get(COOKIE_NAME)?.value;
  if (existing && /^[a-f0-9-]{20,}$/i.test(existing)) {
    return { id: existing, isNew: false };
  }
  return { id: crypto.randomUUID(), isNew: true };
}

function setUidCookie(res: NextResponse, id: string) {
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

// ─────────────────────────────────────────────────────────────────────────────
// GET — read this browser's saved state.
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { id, isNew } = getOrCreateUserId(req);

  const sb = getSupabase();
  if (!sb) {
    const res = NextResponse.json({ state: null, dbAvailable: false });
    if (isNew) setUidCookie(res, id);
    return res;
  }

  try {
    const { data, error } = await sb
      .from(TABLE)
      .select("state")
      .eq("user_id", id)
      .maybeSingle();
    if (error) throw error;
    const state = data?.state ?? null;
    const res = NextResponse.json({ state, dbAvailable: true });
    if (isNew) setUidCookie(res, id);
    return res;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const res = NextResponse.json(
      { state: null, dbAvailable: true, error: message },
      { status: 500 },
    );
    if (isNew) setUidCookie(res, id);
    return res;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST — upsert the entire state blob for this browser.
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const { id, isNew } = getOrCreateUserId(req);

  const sb = getSupabase();
  if (!sb) {
    const res = NextResponse.json(
      { ok: false, dbAvailable: false },
      { status: 501 },
    );
    if (isNew) setUidCookie(res, id);
    return res;
  }

  try {
    const body = await req.json();
    const { error } = await sb.from(TABLE).upsert({
      user_id: id,
      state: body,
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
    const res = NextResponse.json({ ok: true });
    if (isNew) setUidCookie(res, id);
    return res;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE — wipe this browser's state.
// ─────────────────────────────────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  const { id } = getOrCreateUserId(req);

  const sb = getSupabase();
  if (!sb) return NextResponse.json({ ok: true, dbAvailable: false });

  try {
    const { error } = await sb.from(TABLE).delete().eq("user_id", id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}


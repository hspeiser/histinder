import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { resolveUserId, setUidCookie } from "@/src/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TABLE = "histinder_state";

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

export async function GET(req: NextRequest) {
  const user = await resolveUserId(req);

  const sb = getSupabase();
  if (!sb) {
    const res = NextResponse.json({ state: null, dbAvailable: false });
    if (user.isNew) setUidCookie(res, user.id);
    return res;
  }

  try {
    const { data, error } = await sb
      .from(TABLE)
      .select("state")
      .eq("user_id", user.id)
      .maybeSingle();
    if (error) throw error;
    const state = data?.state ?? null;
    const res = NextResponse.json({
      state,
      dbAvailable: true,
      isAuth: user.isAuth,
    });
    if (user.isNew) setUidCookie(res, user.id);
    return res;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const res = NextResponse.json(
      { state: null, dbAvailable: true, error: message },
      { status: 500 },
    );
    if (user.isNew) setUidCookie(res, user.id);
    return res;
  }
}

export async function POST(req: NextRequest) {
  const user = await resolveUserId(req);

  const sb = getSupabase();
  if (!sb) {
    const res = NextResponse.json(
      { ok: false, dbAvailable: false },
      { status: 501 },
    );
    if (user.isNew) setUidCookie(res, user.id);
    return res;
  }

  try {
    const body = await req.json();
    const { error } = await sb.from(TABLE).upsert({
      user_id: user.id,
      state: body,
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
    const res = NextResponse.json({ ok: true });
    if (user.isNew) setUidCookie(res, user.id);
    return res;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const user = await resolveUserId(req);

  const sb = getSupabase();
  if (!sb) return NextResponse.json({ ok: true, dbAvailable: false });

  try {
    const { error } = await sb.from(TABLE).delete().eq("user_id", user.id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { resolveUserId } from "@/src/auth";

export const runtime = "nodejs";

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

/**
 * One-shot migration after a fresh sign-up: copies the anonymous cookie's
 * data over to the new authenticated user_id, then deletes the anonymous row.
 *
 * Caller must send Authorization: Bearer <access_token> header AND have the
 * anonymous histinder_uid cookie present. If they collide, no-ops.
 */
export async function POST(req: NextRequest) {
  const user = await resolveUserId(req);
  if (!user.isAuth) {
    return NextResponse.json(
      { ok: false, error: "not authenticated" },
      { status: 401 },
    );
  }
  const cookieId = user.cookieId;
  if (!cookieId || cookieId === user.id) {
    return NextResponse.json({ ok: true, noop: true });
  }

  const sb = getSupabase();
  if (!sb) {
    return NextResponse.json(
      { ok: false, error: "db unavailable" },
      { status: 501 },
    );
  }

  try {
    // Migrate state row.
    const { data: existing } = await sb
      .from("histinder_state")
      .select("state")
      .eq("user_id", cookieId)
      .maybeSingle();

    if (existing?.state) {
      await sb.from("histinder_state").upsert({
        user_id: user.id,
        state: existing.state,
        updated_at: new Date().toISOString(),
      });
      await sb.from("histinder_state").delete().eq("user_id", cookieId);
    }

    // Migrate chat logs.
    await sb
      .from("histinder_chat_messages")
      .update({ user_id: user.id })
      .eq("user_id", cookieId);

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

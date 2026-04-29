import { NextRequest, NextResponse } from "next/server";
import { generateEndCard } from "@/src/chat";
import type { EndCardInput } from "@/src/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const body = (await req.json()) as EndCardInput;
  try {
    const card = await generateEndCard(body);
    return NextResponse.json(card);
  } catch (err) {
    const message = err instanceof Error ? err.message : "end-card error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { generateOpening } from "@/src/chat";
import type { UserBio } from "@/src/types";

export const runtime = "nodejs";
export const maxDuration = 60;

interface Body {
  figureId: string;
  userBio: UserBio;
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as Body;
  try {
    const message = await generateOpening(body.figureId, body.userBio);
    return NextResponse.json({ message });
  } catch (err) {
    const message = err instanceof Error ? err.message : "opening error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

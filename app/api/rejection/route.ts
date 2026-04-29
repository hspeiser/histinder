import { NextRequest, NextResponse } from "next/server";
import { generateRejection } from "@/src/chat";
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
    const message = await generateRejection(body.figureId, body.userBio);
    return NextResponse.json({ message });
  } catch (err) {
    const message = err instanceof Error ? err.message : "rejection error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

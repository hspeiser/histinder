import { NextRequest, NextResponse } from "next/server";
import { generateOpening } from "@/src/chat";
import { getUserIdFromRequest, logChat } from "@/src/log";
import type { UserBio } from "@/src/types";

export const runtime = "nodejs";
export const maxDuration = 60;

interface Body {
  figureId: string;
  userBio: UserBio;
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as Body;
  const userId = getUserIdFromRequest(req);
  try {
    const message = await generateOpening(body.figureId, body.userBio);
    if (userId) {
      void logChat([
        {
          user_id: userId,
          figure_id: body.figureId,
          role: "figure",
          kind: "opener",
          content: message,
        },
      ]);
    }
    return NextResponse.json({ message });
  } catch (err) {
    const message = err instanceof Error ? err.message : "opening error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

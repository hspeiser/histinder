import { NextRequest, NextResponse } from "next/server";
import { generateBump } from "@/src/chat";
import { getUserIdFromRequest, logChat } from "@/src/log";
import type { ChatMessage, UserBio } from "@/src/types";

export const runtime = "nodejs";
export const maxDuration = 60;

interface Body {
  figureId: string;
  userBio: UserBio;
  history: ChatMessage[];
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as Body;
  const userId = await getUserIdFromRequest(req);
  try {
    const message = await generateBump(body.figureId, body.userBio, body.history);
    if (userId) {
      void logChat([
        {
          user_id: userId,
          figure_id: body.figureId,
          role: "figure",
          kind: "message",
          content: `[BUMP] ${message}`,
        },
      ]);
    }
    return NextResponse.json({ message });
  } catch (err) {
    const message = err instanceof Error ? err.message : "bump error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

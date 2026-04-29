import { NextRequest } from "next/server";
import { streamChatTurn } from "@/src/chat";
import type { ChatMessage, UserBio } from "@/src/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface Body {
  figureId: string;
  userBio: UserBio;
  history: ChatMessage[];
  userMessage: string;
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as Body;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const delta of streamChatTurn(body)) {
          controller.enqueue(encoder.encode(delta));
        }
        controller.close();
      } catch (err) {
        const message = err instanceof Error ? err.message : "stream error";
        controller.enqueue(encoder.encode(`\n[error: ${message}]`));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}

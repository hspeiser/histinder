import { NextRequest } from "next/server";
import { streamChatTurn } from "@/src/chat";
import { getUserIdFromRequest, logChat } from "@/src/log";
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
  const userId = getUserIdFromRequest(req);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let figureBuffer = "";
      try {
        for await (const delta of streamChatTurn(body)) {
          controller.enqueue(encoder.encode(delta));
          figureBuffer += delta;
        }
        controller.close();
      } catch (err) {
        const message = err instanceof Error ? err.message : "stream error";
        controller.enqueue(encoder.encode(`\n[error: ${message}]`));
        controller.close();
      }

      // Log both turns AFTER the stream completes. Best-effort.
      if (userId) {
        const cleaned = figureBuffer.trim();
        const isEnd = /^\[END\]/i.test(cleaned);
        const figureContent = isEnd ? cleaned.replace(/^\[END\]\s*/i, "") : cleaned;
        void logChat([
          {
            user_id: userId,
            figure_id: body.figureId,
            role: "user",
            kind: "message",
            content: body.userMessage,
          },
          ...(figureContent
            ? [{
                user_id: userId,
                figure_id: body.figureId,
                role: "figure" as const,
                kind: (isEnd ? "end" : "message") as "end" | "message",
                content: figureContent,
              }]
            : []),
        ]);
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

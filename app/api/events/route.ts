import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { eventBus, AppEvent } from "@/lib/events/eventBus";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = session.user.email || "guest";
  const userRole = (session.user.role as string) || "USER";

  const encoder = new TextEncoder();
  const id = crypto.randomUUID();

  const stream = new ReadableStream({
    start(controller) {
      const connectEvent = `event: connected\ndata: ${JSON.stringify({
        type: "connected",
        timestamp: Date.now(),
        user: session.user?.email,
      })}\n\n`;
      controller.enqueue(encoder.encode(connectEvent));

      const unsubscribe = eventBus.subscribe(id, (event: AppEvent) => {
        const isRelevant =
          userRole === "ADMIN" ||
          event.userId === userId ||
          event.userEmail === session.user?.email;

        if (isRelevant || userRole === "ADMIN") {
          const sseEvent = `event: activity\ndata: ${JSON.stringify([event])}\n\n`;
          controller.enqueue(encoder.encode(sseEvent));
        }
      });

      const heartbeatInterval = setInterval(() => {
        const heartbeat = `event: heartbeat\ndata: ${JSON.stringify({ timestamp: Date.now() })}\n\n`;
        controller.enqueue(encoder.encode(heartbeat));
      }, 30000);

      request.signal.addEventListener("abort", () => {
        unsubscribe();
        clearInterval(heartbeatInterval);
        controller.close();
      });
    },
    cancel() {},
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

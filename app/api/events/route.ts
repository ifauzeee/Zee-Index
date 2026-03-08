import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const encoder = new TextEncoder();
  let intervalId: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const connectEvent = `event: connected\ndata: ${JSON.stringify({
        type: "connected",
        timestamp: Date.now(),
        user: session.user?.email,
      })}\n\n`;
      controller.enqueue(encoder.encode(connectEvent));

      intervalId = setInterval(() => {
        try {
          const heartbeat = `event: heartbeat\ndata: ${JSON.stringify({ timestamp: Date.now() })}\n\n`;
          controller.enqueue(encoder.encode(heartbeat));
        } catch {
          if (intervalId) clearInterval(intervalId);
        }
      }, 30000);

      const pollInterval = setInterval(async () => {
        try {
          const recentLogs = await db.activityLog.findMany({
            where: {
              timestamp: { gte: Date.now() - 10000 },
            },
            orderBy: { timestamp: "desc" },
            take: 5,
          });

          if (recentLogs.length > 0) {
            const notifications = recentLogs.map((log: any) => ({
              id: log.id,
              type: log.type,
              message: formatActivityMessage(
                log.type,
                log.itemName,
                log.userEmail,
              ),
              severity: log.severity,
              timestamp: log.timestamp,
              itemName: log.itemName,
              userEmail: log.userEmail,
            }));

            const event = `event: activity\ndata: ${JSON.stringify(notifications)}\n\n`;
            controller.enqueue(encoder.encode(event));
          }
        } catch {}
      }, 10000);

      request.signal.addEventListener("abort", () => {
        if (intervalId) clearInterval(intervalId);
        clearInterval(pollInterval);
        controller.close();
      });
    },
    cancel() {
      if (intervalId) clearInterval(intervalId);
    },
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

function formatActivityMessage(
  type: string,
  itemName?: string | null,
  userEmail?: string | null,
): string {
  const user = userEmail ? userEmail.split("@")[0] : "Someone";
  const item = itemName || "a file";

  switch (type) {
    case "UPLOAD":
      return `${user} uploaded ${item}`;
    case "DOWNLOAD":
      return `${user} downloaded ${item}`;
    case "DELETE":
      return `${user} deleted ${item}`;
    case "SHARE_CREATED":
      return `${user} shared ${item}`;
    case "LOGIN":
      return `${user} logged in`;
    case "LOGIN_FAILURE":
      return `Failed login attempt from ${userEmail || "unknown"}`;
    case "FOLDER_CREATED":
      return `${user} created folder ${item}`;
    case "MOVE":
      return `${user} moved ${item}`;
    default:
      return `${user} performed ${type.toLowerCase().replace(/_/g, " ")}`;
  }
}

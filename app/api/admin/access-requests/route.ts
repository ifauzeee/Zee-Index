import { NextResponse } from "next/server";
import { createAdminRoute } from "@/lib/api-middleware";
import { kv } from "@/lib/kv";
import { logActivity } from "@/lib/activityLogger";
import { z } from "zod";

export const dynamic = "force-dynamic";

const accessRequestSchema = z
  .object({
    folderId: z.string().min(1),
    email: z.string().min(1),
    timestamp: z.number(),
    folderName: z.string().optional(),
  })
  .passthrough();

const accessRequestActionSchema = z.object({
  action: z.enum(["approve", "reject"]),
  requestData: accessRequestSchema,
});

type AccessRequestRecord = z.infer<typeof accessRequestSchema>;

function parseAccessRequest(value: unknown): AccessRequestRecord | null {
  if (typeof value === "string") {
    if (value === "[object Object]") {
      return null;
    }

    try {
      return parseAccessRequest(JSON.parse(value));
    } catch {
      return null;
    }
  }

  const parsed = accessRequestSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export const GET = createAdminRoute(async () => {
  try {
    const requests = await kv.smembers("zee-index:access-requests:v3");

    const parsedRequests = requests
      .map((requestEntry) => parseAccessRequest(requestEntry))
      .filter(
        (requestEntry): requestEntry is AccessRequestRecord =>
          requestEntry !== null,
      );

    parsedRequests.sort((a, b) => b.timestamp - a.timestamp);

    return NextResponse.json(parsedRequests);
  } catch {
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
});

export const POST = createAdminRoute(async ({ request, session }) => {
  try {
    const parsedBody = accessRequestActionSchema.safeParse(
      await request.json(),
    );
    if (!parsedBody.success) {
      return NextResponse.json(
        { error: "Invalid request payload", details: parsedBody.error.issues },
        { status: 400 },
      );
    }

    const { action, requestData } = parsedBody.data;

    const allRequests = await kv.smembers("zee-index:access-requests:v3");

    let targetToRemove: string | null = null;

    for (const requestEntry of allRequests) {
      const parsed = parseAccessRequest(requestEntry);
      if (!parsed) {
        continue;
      }

      if (
        parsed.folderId === requestData.folderId &&
        parsed.email === requestData.email &&
        parsed.timestamp === requestData.timestamp
      ) {
        targetToRemove = requestEntry;
        break;
      }
    }

    if (action === "approve") {
      await kv.sadd("zee-index:user-access:folders", requestData.folderId);
      await kv.sadd(`folder:access:${requestData.folderId}`, requestData.email);

      await logActivity("ADMIN_ADDED", {
        itemName: requestData.folderName,
        userEmail: session.user?.email,
        targetUser: requestData.email,
        status: "success",
        metadata: {
          source: "access_request_approval",
          folderId: requestData.folderId,
          targetUser: requestData.email,
        },
      });
    }

    if (targetToRemove) {
      await kv.srem("zee-index:access-requests:v3", targetToRemove);
    } else {
      try {
        await kv.srem("zee-index:access-requests:v3", requestData);
      } catch {}
    }

    try {
      await kv.srem("zee-index:access-requests:v3", "[object Object]");
    } catch {}

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Action failed" }, { status: 500 });
  }
});

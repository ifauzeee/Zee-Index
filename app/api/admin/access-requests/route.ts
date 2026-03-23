import { NextResponse } from "next/server";
import { createAdminRoute } from "@/lib/api-middleware";
import { kv } from "@/lib/kv";
import { logActivity } from "@/lib/activityLogger";
import { REDIS_KEYS } from "@/lib/constants";
import {
  accessRequestActionSchema,
  parseAccessRequestRecord,
  serializeAccessRequestRecord,
  type AccessRequestRecord,
} from "@/lib/link-payloads";

export const dynamic = "force-dynamic";

export const GET = createAdminRoute(async () => {
  try {
    const requests = await kv.smembers(REDIS_KEYS.ACCESS_REQUESTS);

    const parsedRequests = requests
      .map((requestEntry) => parseAccessRequestRecord(requestEntry))
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

    const allRequests = await kv.smembers(REDIS_KEYS.ACCESS_REQUESTS);

    let targetToRemove: string | null = null;

    for (const requestEntry of allRequests) {
      const parsed = parseAccessRequestRecord(requestEntry);
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
      await kv.srem(REDIS_KEYS.ACCESS_REQUESTS, targetToRemove);
    } else {
      try {
        await kv.srem(
          REDIS_KEYS.ACCESS_REQUESTS,
          serializeAccessRequestRecord(requestData),
        );
      } catch {}
    }

    try {
      await kv.srem(REDIS_KEYS.ACCESS_REQUESTS, "[object Object]");
    } catch {}

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Action failed" }, { status: 500 });
  }
});

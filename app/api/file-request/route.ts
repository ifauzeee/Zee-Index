import { NextResponse } from "next/server";
import { createAdminRoute } from "@/lib/api-middleware";
import { kv } from "@/lib/kv";
import crypto from "crypto";
import { getBaseUrl } from "@/lib/utils";
import { REDIS_KEYS } from "@/lib/constants";
import {
  fileRequestCreateSchema,
  fileRequestDeleteSchema,
  parseFileRequestLink,
  serializeFileRequestLink,
} from "@/lib/link-payloads";

export const POST = createAdminRoute(async ({ request, session }) => {
  try {
    const parsedBody = fileRequestCreateSchema.safeParse(await request.json());
    if (!parsedBody.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { folderId, folderName, title, expiresIn } = parsedBody.data;
    const token = crypto.randomBytes(16).toString("hex");
    const expiresAt = Date.now() + expiresIn * 60 * 60 * 1000;

    const requestData = serializeFileRequestLink({
      token,
      folderId,
      folderName,
      title,
      createdAt: Date.now(),
      expiresAt,
      createdBy: session.user.email ?? undefined,
      type: "file-request",
    });

    await kv.hset(REDIS_KEYS.FILE_REQUESTS, { [token]: requestData });

    const publicUrl = `${getBaseUrl()}/request/${token}`;

    return NextResponse.json({ success: true, token, publicUrl });
  } catch (error) {
    console.error("Create File Request Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
});

export const dynamic = "force-dynamic";

export const GET = createAdminRoute(async () => {
  try {
    const requests = await kv.hgetall<Record<string, unknown>>(
      REDIS_KEYS.FILE_REQUESTS,
    );
    const now = Date.now();
    const activeRequests = Object.values(requests || {})
      .map((value) => parseFileRequestLink(value))
      .filter(
        (requestData): requestData is NonNullable<typeof requestData> =>
          requestData !== null &&
          (!requestData.expiresAt || requestData.expiresAt > now),
      );

    return NextResponse.json(activeRequests);
  } catch (error) {
    console.error("Get File Requests Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
});

export const DELETE = createAdminRoute(async ({ request }) => {
  try {
    const parsedBody = fileRequestDeleteSchema.safeParse(await request.json());
    if (!parsedBody.success) {
      return NextResponse.json({ error: "Token required" }, { status: 400 });
    }

    await kv.hdel(REDIS_KEYS.FILE_REQUESTS, parsedBody.data.token);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete File Request Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
});

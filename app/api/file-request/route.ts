import { logger } from "@/lib/logger";
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

export const POST = createAdminRoute(
  async ({ body, session }) => {
    try {
      const { folderId, folderName, title, expiresIn } = body;
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
      logger.error({ err: error }, "Create File Request Error");
      return NextResponse.json(
        { error: "Internal Server Error" },
        { status: 500 },
      );
    }
  },
  { bodySchema: fileRequestCreateSchema },
);

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
    logger.error({ err: error }, "Get File Requests Error");
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
});

export const DELETE = createAdminRoute(
  async ({ body }) => {
    try {
      await kv.hdel(REDIS_KEYS.FILE_REQUESTS, body.token);
      return NextResponse.json({ success: true });
    } catch (error) {
      logger.error({ err: error }, "Delete File Request Error");
      return NextResponse.json(
        { error: "Internal Server Error" },
        { status: 500 },
      );
    }
  },
  { bodySchema: fileRequestDeleteSchema },
);

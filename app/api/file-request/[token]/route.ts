import { NextResponse } from "next/server";
import { createPublicRoute } from "@/lib/api-middleware";
import { kv } from "@/lib/kv";
import { REDIS_KEYS } from "@/lib/constants";
import { parseFileRequestLink } from "@/lib/link-payloads";

export const dynamic = "force-dynamic";

export const GET = createPublicRoute(
  async ({ params }) => {
    const { token } = params;
    try {
      const requestData = parseFileRequestLink(
        await kv.hget(REDIS_KEYS.FILE_REQUESTS, token),
      );

      if (!requestData) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      if (Date.now() > requestData.expiresAt) {
        await kv.hdel(REDIS_KEYS.FILE_REQUESTS, token);
        return NextResponse.json({ error: "Expired" }, { status: 410 });
      }

      return NextResponse.json({
        title: requestData.title,
        folderName: requestData.folderName,
        expiresAt: requestData.expiresAt,
        folderId: requestData.folderId,
      });
    } catch {
      return NextResponse.json(
        { error: "Internal Server Error" },
        { status: 500 },
      );
    }
  },
  { rateLimit: false },
);

import { NextResponse } from "next/server";
import { createAdminRoute } from "@/lib/api-middleware";
import { kv } from "@/lib/kv";
import crypto from "crypto";
import { z } from "zod";
import { getBaseUrl } from "@/lib/utils";

const FILE_REQUESTS_KEY = "zee-index:file-requests";

const createSchema = z.object({
  folderId: z.string().min(1),
  folderName: z.string().min(1),
  title: z.string().min(1),
  expiresIn: z.number().min(1),
});

export const POST = createAdminRoute(async ({ request, session }) => {
  try {
    const body = await request.json();
    const validation = createSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { folderId, folderName, title, expiresIn } = validation.data;
    const token = crypto.randomBytes(16).toString("hex");
    const expiresAt = Date.now() + expiresIn * 60 * 60 * 1000;

    const requestData = {
      token,
      folderId,
      folderName,
      title,
      createdAt: Date.now(),
      expiresAt,
      createdBy: session.user.email,
      type: "file-request",
    };

    await kv.hset(FILE_REQUESTS_KEY, { [token]: requestData });

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
    const requests = await kv.hgetall(FILE_REQUESTS_KEY);
    const now = Date.now();
    const allRequests = Object.values(requests || {}) as Array<{
      expiresAt?: number;
    }>;
    const activeRequests = allRequests.filter(
      (req) => !req.expiresAt || req.expiresAt > now,
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
    const { token } = await request.json();
    if (!token)
      return NextResponse.json({ error: "Token required" }, { status: 400 });

    await kv.hdel(FILE_REQUESTS_KEY, token);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete File Request Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
});

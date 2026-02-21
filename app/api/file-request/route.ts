import { NextResponse, NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { kv } from "@/lib/kv";
import crypto from "crypto";
import { z } from "zod";

const FILE_REQUESTS_KEY = "zee-index:file-requests";

const createSchema = z.object({
  folderId: z.string().min(1),
  folderName: z.string().min(1),
  title: z.string().min(1),
  expiresIn: z.number().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
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

    const publicUrl = `${new URL(req.url).origin}/request/${token}`;

    return NextResponse.json({ success: true, token, publicUrl });
  } catch (error) {
    console.error("Create File Request Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

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
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { token } = await req.json();
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
}

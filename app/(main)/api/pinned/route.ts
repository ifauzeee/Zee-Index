// FILE: app/(main)/api/pinned/route.ts

import { NextResponse, NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { kv } from "@vercel/kv";
import { getFileDetailsFromDrive, DriveFile } from "@/lib/googleDrive";
import { z } from "zod";

const PINNED_KEY = "zee-index:pinned-folders";

const pinSchema = z.object({
  folderId: z.string().min(1),
});

export async function GET() {
  try {
    const pinnedIds: string[] = await kv.smembers(PINNED_KEY);

    if (!pinnedIds || pinnedIds.length === 0) {
      return NextResponse.json([]);
    }

    const promises = pinnedIds.map(async (id) => {
      const detail = await getFileDetailsFromDrive(id);
      if (!detail) {
        await kv.srem(PINNED_KEY, id);
      }
      return detail;
    });
    const results = await Promise.all(promises);

    const pinnedFolders = results.filter(
      (file): file is DriveFile =>
        file !== null && !file.trashed && file.isFolder,
    );

    return NextResponse.json(pinnedFolders);
  } catch (error) {
    console.error("Pinned folders API Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch pinned folders" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const validation = pinSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { folderId } = validation.data;
    await kv.sadd(PINNED_KEY, folderId);

    return NextResponse.json({
      success: true,
      message: "Folder berhasil disematkan.",
    });
  } catch {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { folderId } = body;

    if (!folderId)
      return NextResponse.json(
        { error: "Folder ID required" },
        { status: 400 },
      );

    await kv.srem(PINNED_KEY, folderId);

    return NextResponse.json({ success: true, message: "Pin folder dilepas." });
  } catch {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

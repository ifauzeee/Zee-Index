import { NextResponse, NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { kv } from "@vercel/kv";
import { z } from "zod";

const TAGS_KEY_PREFIX = "zee-index:tags:";

const tagSchema = z.object({
  fileId: z.string().min(1),
  tag: z.string().min(1).max(20),
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const fileId = searchParams.get("fileId");

  if (!fileId) {
    return NextResponse.json({ error: "File ID required" }, { status: 400 });
  }

  try {
    const tags: string[] =
      (await kv.smembers(`${TAGS_KEY_PREFIX}${fileId}`)) || [];
    return NextResponse.json(tags);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch tags" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const validation = tagSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { fileId, tag } = validation.data;
    const key = `${TAGS_KEY_PREFIX}${fileId}`;

    await kv.sadd(key, tag.toLowerCase().trim());
    const tags = await kv.smembers(key);

    return NextResponse.json(tags);
  } catch {
    return NextResponse.json({ error: "Failed to add tag" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const validation = tagSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { fileId, tag } = validation.data;
    const key = `${TAGS_KEY_PREFIX}${fileId}`;

    await kv.srem(key, tag.toLowerCase().trim());
    const tags = await kv.smembers(key);

    return NextResponse.json(tags);
  } catch {
    return NextResponse.json(
      { error: "Failed to remove tag" },
      { status: 500 },
    );
  }
}

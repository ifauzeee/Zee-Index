import { NextResponse, NextRequest } from "next/server";
import { kv } from "@/lib/kv";

const TAGS_PREFIX = "zee_tags:";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const fileId = searchParams.get("fileId");

  if (!fileId)
    return NextResponse.json({ error: "Missing fileId" }, { status: 400 });

  const tags = await kv.smembers(`${TAGS_PREFIX}${fileId}`);
  return NextResponse.json({ tags: tags || [] });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { fileId, tag, action } = body;

  if (!fileId || !tag)
    return NextResponse.json({ error: "Missing data" }, { status: 400 });

  const key = `${TAGS_PREFIX}${fileId}`;

  if (action === "add") {
    await kv.sadd(key, tag);
  } else if (action === "remove") {
    await kv.srem(key, tag);
  }

  return NextResponse.json({ success: true });
}

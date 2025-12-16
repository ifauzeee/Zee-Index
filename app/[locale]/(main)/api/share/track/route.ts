import { NextRequest } from "next/server";
import { kv } from "@/lib/kv";
import { jwtVerify } from "jose";

export async function POST(req: NextRequest) {
  try {
    const { shareToken } = await req.json();
    if (!shareToken) return new Response(null, { status: 204 });

    const secret = new TextEncoder().encode(process.env.SHARE_SECRET_KEY!);
    const { payload } = await jwtVerify(shareToken, secret);
    const jti = payload.jti;
    if (!jti) return new Response(null, { status: 204 });

    const key = `zee-index:share-view-count:${jti}`;
    await kv.incr(key);

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("Share link tracking error:", error);
    return new Response(null, { status: 204 });
  }
}

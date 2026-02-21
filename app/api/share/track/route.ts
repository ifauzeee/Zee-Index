export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { jwtVerify } from "jose";

export async function POST(req: NextRequest) {
  try {
    const { shareToken } = await req.json();
    if (!shareToken) return new Response(null, { status: 204 });

    const secret = new TextEncoder().encode(process.env.SHARE_SECRET_KEY!);
    const { payload } = await jwtVerify(shareToken, secret);
    const jti = payload.jti;
    if (!jti) return new Response(null, { status: 204 });

    await db.shareLink
      .update({
        where: { jti },
        data: {
          views: { increment: 1 },
        },
      })
      .catch(() => {});

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("Share link tracking error:", error);
    return new Response(null, { status: 204 });
  }
}

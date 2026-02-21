export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { kv } from "@/lib/kv";

export async function POST(req: NextRequest) {
  try {
    const { shareToken } = await req.json();

    if (!shareToken) {
      return NextResponse.json(
        { valid: false, error: "Token not provided" },
        { status: 400 },
      );
    }

    const secret = new TextEncoder().encode(process.env.SHARE_SECRET_KEY!);
    const { payload } = await jwtVerify(shareToken, secret);

    if (typeof payload.jti !== "string") {
      return NextResponse.json(
        { valid: false, error: "Invalid token JTI" },
        { status: 400 },
      );
    }

    const isBlocked = await kv.get(`zee-index:blocked:${payload.jti}`);

    if (isBlocked) {
      return NextResponse.json({ valid: false });
    }

    return NextResponse.json({ valid: true });
  } catch {
    return NextResponse.json({ valid: false });
  }
}

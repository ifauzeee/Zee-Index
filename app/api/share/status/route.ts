export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createPublicRoute } from "@/lib/api-middleware";
import { jwtVerify } from "jose";
import { kv } from "@/lib/kv";

export const POST = createPublicRoute(
  async ({ request }) => {
    try {
      const { shareToken } = await request.json();

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
  },
  { rateLimit: false },
);

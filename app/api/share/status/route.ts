export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createPublicRoute } from "@/lib/api-middleware";
import { jwtVerify } from "jose";
import { kv } from "@/lib/kv";
import { REDIS_KEYS } from "@/lib/constants";
import { shareTokenRequestSchema } from "@/lib/link-payloads";

export const POST = createPublicRoute(
  async ({ request }) => {
    try {
      const parsedBody = shareTokenRequestSchema.safeParse(
        await request.json(),
      );
      if (!parsedBody.success) {
        return NextResponse.json(
          { valid: false, error: "Token not provided" },
          { status: 400 },
        );
      }

      const { shareToken } = parsedBody.data;

      const secret = new TextEncoder().encode(process.env.SHARE_SECRET_KEY!);
      const { payload } = await jwtVerify(shareToken, secret);

      if (typeof payload.jti !== "string") {
        return NextResponse.json(
          { valid: false, error: "Invalid token JTI" },
          { status: 400 },
        );
      }

      const isBlocked = await kv.get(
        `${REDIS_KEYS.SHARE_BLOCKED}${payload.jti}`,
      );

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

export const dynamic = "force-dynamic";

import { createPublicRoute } from "@/lib/api-middleware";
import { db } from "@/lib/db";
import { jwtVerify } from "jose";
import { shareTokenRequestSchema } from "@/lib/link-payloads";

export const POST = createPublicRoute(
  async ({ request }) => {
    try {
      const parsedBody = shareTokenRequestSchema.safeParse(
        await request.json(),
      );
      if (!parsedBody.success) {
        return new Response(null, { status: 204 });
      }

      const { shareToken } = parsedBody.data;

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
  },
  { rateLimit: false },
);

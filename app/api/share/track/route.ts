import { logger } from "@/lib/logger";
export const dynamic = "force-dynamic";

import { createPublicRoute } from "@/lib/api-middleware";
import { jwtVerify } from "jose";
import { shareTokenRequestSchema } from "@/lib/link-payloads";
import { recordShareView } from "@/lib/share-grant";
import { getClientIp } from "@/lib/client-ip";

export const POST = createPublicRoute(
  async ({ request, body, session }) => {
    try {
      const { shareToken } = body;

      const secret = new TextEncoder().encode(process.env.SHARE_SECRET_KEY!);
      const { payload } = await jwtVerify(shareToken, secret);
      const jti = payload.jti;
      if (!jti) return new Response(null, { status: 204 });

      // Counted once per viewer per window, so repeated calls cannot burn
      // through another recipient's maxUses (Z2-04).
      await recordShareView(
        jti,
        session?.user?.email || getClientIp(request.headers),
      ).catch((err) =>
        logger.warn({ err, jti }, "Share view increment failed"),
      );

      return new Response(null, { status: 204 });
    } catch (error) {
      logger.error({ err: error }, "Share link tracking error");
      return new Response(null, { status: 204 });
    }
  },
  {
    rateLimit: "API",
    includeSession: true,
    bodySchema: shareTokenRequestSchema,
  },
);

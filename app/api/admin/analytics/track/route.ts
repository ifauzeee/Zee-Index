import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";
import { createPublicRoute } from "@/lib/api-middleware";
import { trackPageView } from "@/lib/analyticsTracker";
import { analyticsTrackRequestSchema } from "@/lib/telemetry";
import { getClientIp } from "@/lib/client-ip";

export const dynamic = "force-dynamic";

export const POST = createPublicRoute(
  async ({ body, request }) => {
    try {
      const path = body.path;
      const referrer = body.referrer;

      const userAgent = request.headers.get("user-agent") || "unknown";
      const ip = getClientIp(request.headers);

      await trackPageView({
        path,
        ip,
        userAgent,
        referrer,
      });

      return NextResponse.json({ ok: true });
    } catch (error) {
      logger.error({ err: error }, "Failed to track page view");
      return NextResponse.json({ ok: false }, { status: 500 });
    }
  },
  { bodySchema: analyticsTrackRequestSchema, rateLimit: "API" },
);

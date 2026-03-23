import { NextResponse } from "next/server";
import { createPublicRoute } from "@/lib/api-middleware";
import { trackPageView } from "@/lib/analyticsTracker";
import { analyticsTrackRequestSchema } from "@/lib/telemetry";

export const dynamic = "force-dynamic";

export const POST = createPublicRoute(
  async ({ body, request }) => {
    try {
      const path = body.path;
      const referrer = body.referrer;

      const forwardedFor = request.headers.get("x-forwarded-for");
      const realIp = request.headers.get("x-real-ip");
      const userAgent = request.headers.get("user-agent") || "unknown";

      let ip = "unknown";
      if (forwardedFor) {
        ip = forwardedFor.split(",")[0].trim();
      } else if (realIp) {
        ip = realIp;
      }

      await trackPageView({
        path,
        ip,
        userAgent,
        referrer,
      });

      return NextResponse.json({ ok: true });
    } catch (error) {
      console.error("Failed to track page view:", error);
      return NextResponse.json({ ok: false }, { status: 500 });
    }
  },
  { bodySchema: analyticsTrackRequestSchema, rateLimit: false },
);

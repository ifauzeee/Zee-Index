import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";
import { createPublicRoute } from "@/lib/api-middleware";
import { getPublicAppConfig } from "@/lib/app-config";
export const dynamic = "force-dynamic";

export const GET = createPublicRoute(
  async () => {
    try {
      const config = await getPublicAppConfig();
      return NextResponse.json(config);
    } catch (error) {
      logger.error({ err: error }, "Failed to fetch public config");
      return NextResponse.json(
        { error: "Failed to fetch configuration." },
        { status: 500 },
      );
    }
  },
  { rateLimit: false },
);

import { NextResponse } from "next/server";
import { createPublicRoute } from "@/lib/api-middleware";
import { getStorageDetails } from "@/lib/drive";
import { logger } from "@/lib/logger";

export const revalidate = 7200;
export const maxDuration = 60;

export const dynamic = "force-dynamic";

export const GET = createPublicRoute(
  async () => {
    try {
      const storageDetails = await getStorageDetails();
      return NextResponse.json({
        totalUsage: storageDetails.usage,
      });
    } catch (error: unknown) {
      logger.error({ err: error }, "Failed to calculate data usage");
      return NextResponse.json(
        { error: "Failed to calculate data usage." },
        { status: 500 },
      );
    }
  },
  { rateLimit: false },
);

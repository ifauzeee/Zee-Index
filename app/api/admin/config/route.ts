import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";
import { createAdminRoute } from "@/lib/api-middleware";
import {
  appConfigUpdateSchema,
  getAppConfig,
  sanitizeAdminAppConfig,
  updateAppConfig,
} from "@/lib/app-config";
import { getNotificationChannelStatus } from "@/lib/notification";
import { invalidateActiveProvider } from "@/lib/storage/providers";
import { getStorageStatus } from "@/lib/storage/status";

export const dynamic = "force-dynamic";

export const GET = createAdminRoute(async () => {
  try {
    const config = await getAppConfig();
    return NextResponse.json({
      ...sanitizeAdminAppConfig(config),
      notifications: getNotificationChannelStatus(),
      storage: getStorageStatus(),
    });
  } catch (error) {
    logger.error({ err: error }, "Config fetch error");
    return NextResponse.json(
      { error: "Failed to fetch config" },
      { status: 500 },
    );
  }
});

export const POST = createAdminRoute(
  async ({ body }) => {
    try {
      const updatedConfig = await updateAppConfig(body);

      // Invalidate cached storage provider so env changes take effect
      invalidateActiveProvider();

      return NextResponse.json({
        message: "Config updated",
        config: sanitizeAdminAppConfig(updatedConfig),
      });
    } catch (error) {
      logger.error({ err: error }, "Config update error");
      return NextResponse.json(
        { error: "Failed to update config" },
        { status: 500 },
      );
    }
  },
  { bodySchema: appConfigUpdateSchema },
);

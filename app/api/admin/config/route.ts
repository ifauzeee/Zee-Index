import { NextResponse } from "next/server";
import { createAdminRoute } from "@/lib/api-middleware";
import {
  appConfigUpdateSchema,
  getAppConfig,
  updateAppConfig,
} from "@/lib/app-config";

export const dynamic = "force-dynamic";

export const GET = createAdminRoute(async () => {
  try {
    const config = await getAppConfig();
    return NextResponse.json(config);
  } catch (error) {
    console.error("Config fetch error:", error);
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

      return NextResponse.json({
        message: "Config updated",
        config: updatedConfig,
      });
    } catch (error) {
      console.error("Config update error:", error);
      return NextResponse.json(
        { error: "Failed to update config" },
        { status: 500 },
      );
    }
  },
  { bodySchema: appConfigUpdateSchema },
);

import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { createAdminRoute } from "@/lib/api-middleware";

const CONFIG_KEY = "zee-index:config";

export const dynamic = "force-dynamic";

export const GET = createAdminRoute(async () => {
  try {
    const configEntry = await db.adminConfig.findUnique({
      where: { key: CONFIG_KEY },
    });
    const config = configEntry ? JSON.parse(configEntry.value) : {};
    return NextResponse.json(config);
  } catch (error) {
    console.error("Config fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch config" },
      { status: 500 },
    );
  }
});

export const POST = createAdminRoute(async ({ request }) => {
  try {
    const body = await request.json();
    const updatedConfigEntry = await db.adminConfig.upsert({
      where: { key: CONFIG_KEY },
      update: { value: JSON.stringify(body) },
      create: { key: CONFIG_KEY, value: JSON.stringify(body) },
    });

    const updatedConfig = JSON.parse(updatedConfigEntry.value);

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
});

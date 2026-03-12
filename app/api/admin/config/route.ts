import { db } from "@/lib/db";
import { auth } from "@/auth";
import { NextResponse } from "next/server";

const CONFIG_KEY = "zee-index:config";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
}

export async function POST(req: Request) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
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
}

import { kv } from "@/lib/kv";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";

const CONFIG_KEY = "zee-index:config";

export async function GET() {
  try {
    const config = (await kv.get(CONFIG_KEY)) || {};
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
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    await kv.set(CONFIG_KEY, body);

    const updatedConfig = await kv.get(CONFIG_KEY);
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

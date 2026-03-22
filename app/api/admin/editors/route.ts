import { kv } from "@/lib/kv";
import { NextResponse } from "next/server";
import { createAdminRoute } from "@/lib/api-middleware";
import { REDIS_KEYS } from "@/lib/constants";

export const dynamic = "force-dynamic";

export const GET = createAdminRoute(async () => {
  try {
    const editors = await kv.smembers(REDIS_KEYS.ADMIN_EDITORS);
    return NextResponse.json(editors || []);
  } catch (error) {
    console.error("Editors fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch editors" },
      { status: 500 },
    );
  }
});

export const POST = createAdminRoute(async ({ request }) => {
  try {
    const { email } = await request.json();
    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    await kv.sadd(REDIS_KEYS.ADMIN_EDITORS, email);
    return NextResponse.json({ message: "Editor added", email });
  } catch (error) {
    console.error("Editor add error:", error);
    return NextResponse.json(
      { error: "Failed to add editor" },
      { status: 500 },
    );
  }
});

export const DELETE = createAdminRoute(async ({ request }) => {
  try {
    const { email } = await request.json();
    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    await kv.srem(REDIS_KEYS.ADMIN_EDITORS, email);
    return NextResponse.json({ message: "Editor removed", email });
  } catch (error) {
    console.error("Editor remove error:", error);
    return NextResponse.json(
      { error: "Failed to remove editor" },
      { status: 500 },
    );
  }
});

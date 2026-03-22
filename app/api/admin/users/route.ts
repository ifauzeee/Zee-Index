import { kv } from "@/lib/kv";
import { NextResponse } from "next/server";
import { createAdminRoute } from "@/lib/api-middleware";
import { REDIS_KEYS } from "@/lib/constants";

export const dynamic = "force-dynamic";

export const GET = createAdminRoute(async () => {
  try {
    const admins = await kv.smembers(REDIS_KEYS.ADMIN_USERS);
    return NextResponse.json(admins || []);
  } catch (error) {
    console.error("Admin users fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch admins" },
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

    await kv.sadd(REDIS_KEYS.ADMIN_USERS, email);
    return NextResponse.json({ message: "Admin added", email });
  } catch (error) {
    console.error("Admin add error:", error);
    return NextResponse.json({ error: "Failed to add admin" }, { status: 500 });
  }
});

export const DELETE = createAdminRoute(async ({ request }) => {
  try {
    const { email } = await request.json();
    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    await kv.srem(REDIS_KEYS.ADMIN_USERS, email);
    return NextResponse.json({ message: "Admin removed", email });
  } catch (error) {
    console.error("Admin remove error:", error);
    return NextResponse.json(
      { error: "Failed to remove admin" },
      { status: 500 },
    );
  }
});

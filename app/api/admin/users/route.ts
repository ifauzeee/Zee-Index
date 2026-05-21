import { logger } from "@/lib/logger";
import { kv } from "@/lib/kv";
import { NextResponse } from "next/server";
import { createAdminRoute } from "@/lib/api-middleware";
import { REDIS_KEYS } from "@/lib/constants";
import { z } from "zod";

const emailSchema = z.object({
  email: z
    .string()
    .email("Invalid email format")
    .transform((v) => v.trim()),
});

export const dynamic = "force-dynamic";

export const GET = createAdminRoute(async () => {
  try {
    const admins = await kv.smembers(REDIS_KEYS.ADMIN_USERS);
    return NextResponse.json(admins || []);
  } catch (error) {
    logger.error({ err: error }, "Admin users fetch error");
    return NextResponse.json(
      { error: "Failed to fetch admins" },
      { status: 500 },
    );
  }
});

export const POST = createAdminRoute(
  async ({ body }) => {
    try {
      const { email } = body;
      await kv.sadd(REDIS_KEYS.ADMIN_USERS, email);
      return NextResponse.json({ message: "Admin added", email });
    } catch (error) {
      logger.error({ err: error }, "Admin add error");
      return NextResponse.json(
        { error: "Failed to add admin" },
        { status: 500 },
      );
    }
  },
  { bodySchema: emailSchema },
);

export const DELETE = createAdminRoute(
  async ({ body }) => {
    try {
      const { email } = body;
      await kv.srem(REDIS_KEYS.ADMIN_USERS, email);
      return NextResponse.json({ message: "Admin removed", email });
    } catch (error) {
      logger.error({ err: error }, "Admin remove error");
      return NextResponse.json(
        { error: "Failed to remove admin" },
        { status: 500 },
      );
    }
  },
  { bodySchema: emailSchema },
);

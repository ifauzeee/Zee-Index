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
    const editors = await kv.smembers(REDIS_KEYS.ADMIN_EDITORS);
    return NextResponse.json(editors || []);
  } catch (error) {
    logger.error({ err: error }, "Editors fetch error");
    return NextResponse.json(
      { error: "Failed to fetch editors" },
      { status: 500 },
    );
  }
});

export const POST = createAdminRoute(
  async ({ body }) => {
    try {
      const { email } = body;
      await kv.sadd(REDIS_KEYS.ADMIN_EDITORS, email);
      return NextResponse.json({ message: "Editor added", email });
    } catch (error) {
      logger.error({ err: error }, "Editor add error");
      return NextResponse.json(
        { error: "Failed to add editor" },
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
      await kv.srem(REDIS_KEYS.ADMIN_EDITORS, email);
      return NextResponse.json({ message: "Editor removed", email });
    } catch (error) {
      logger.error({ err: error }, "Editor remove error");
      return NextResponse.json(
        { error: "Failed to remove editor" },
        { status: 500 },
      );
    }
  },
  { bodySchema: emailSchema },
);

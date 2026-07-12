import { logger } from "@/lib/logger";
import { kv } from "@/lib/kv";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { createAdminRoute } from "@/lib/api-middleware";
import { REDIS_KEYS } from "@/lib/constants";
import { z } from "zod";

const emailSchema = z.object({
  email: z
    .string()
    .email("Invalid email format")
    .transform((v) => v.toLowerCase().trim()),
});

export const dynamic = "force-dynamic";

async function upsertUserRole(
  email: string,
  role: "ADMIN" | "EDITOR" | "USER",
) {
  await db.user.upsert({
    where: { email },
    create: {
      email,
      role,
      name: email.split("@")[0],
    },
    update: { role },
  });
}

export const GET = createAdminRoute(async () => {
  try {
    const [redisEditors, dbEditors] = await Promise.all([
      kv.smembers(REDIS_KEYS.ADMIN_EDITORS),
      db.user.findMany({
        where: { role: "EDITOR" },
        select: { email: true },
      }),
    ]);

    const emails = new Set<string>([
      ...(redisEditors || []).map((e) => e.toLowerCase().trim()),
      ...dbEditors
        .map((u) => u.email?.toLowerCase().trim())
        .filter((e): e is string => !!e),
    ]);

    return NextResponse.json([...emails]);
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
      // Do not demote existing admins when adding as editor.
      const isAdmin = await kv.sismember(REDIS_KEYS.ADMIN_USERS, email);
      await kv.sadd(REDIS_KEYS.ADMIN_EDITORS, email);
      if (isAdmin !== 1) {
        await upsertUserRole(email, "EDITOR");
      }
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
      const isAdmin = await kv.sismember(REDIS_KEYS.ADMIN_USERS, email);
      if (isAdmin !== 1) {
        await upsertUserRole(email, "USER");
      }
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

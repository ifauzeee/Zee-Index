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
    const [redisAdmins, dbAdmins] = await Promise.all([
      kv.smembers(REDIS_KEYS.ADMIN_USERS),
      db.user.findMany({
        where: { role: "ADMIN" },
        select: { email: true },
      }),
    ]);

    const emails = new Set<string>([
      ...(redisAdmins || []).map((e) => e.toLowerCase().trim()),
      ...dbAdmins
        .map((u) => u.email?.toLowerCase().trim())
        .filter((e): e is string => !!e),
    ]);

    return NextResponse.json([...emails]);
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
      await upsertUserRole(email, "ADMIN");
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
      // Demote to USER only if not still an editor.
      const isEditor = await kv.sismember(REDIS_KEYS.ADMIN_EDITORS, email);
      await upsertUserRole(email, isEditor === 1 ? "EDITOR" : "USER");
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

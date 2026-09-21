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

async function upsertUserRole(
  email: string,
  role: "ADMIN" | "EDITOR" | "USER",
) {
  await db.user.upsert({
    where: { email },
    create: { email, role, name: email.split("@")[0] },
    update: { role },
  });
}

interface RoleRouteConfig {
  redisKey: "ADMIN_USERS" | "ADMIN_EDITORS";
  dbRole: "ADMIN" | "EDITOR";
  label: "Admin" | "Editor";
}

export function createRoleRoute({ redisKey, dbRole, label }: RoleRouteConfig) {
  const plural = `${label}s`.toLowerCase();

  const GET = createAdminRoute(async () => {
    try {
      const [redisUsers, dbUsers] = await Promise.all([
        kv.smembers(REDIS_KEYS[redisKey]),
        db.user.findMany({
          where: { role: dbRole },
          select: { email: true },
        }),
      ]);

      const emails = new Set<string>([
        ...(redisUsers || []).map((e) => e.toLowerCase().trim()),
        ...dbUsers
          .map((u) => u.email?.toLowerCase().trim())
          .filter((e): e is string => !!e),
      ]);

      return NextResponse.json([...emails]);
    } catch (error) {
      logger.error({ err: error }, `${label} users fetch error`);
      return NextResponse.json(
        { error: `Failed to fetch ${plural}` },
        { status: 500 },
      );
    }
  });

  const POST = createAdminRoute(
    async ({ body }) => {
      try {
        const { email } = body;
        // Do not demote existing admins when adding a lower role.
        const isAdmin = await kv.sismember(REDIS_KEYS.ADMIN_USERS, email);
        await kv.sadd(REDIS_KEYS[redisKey], email);
        if (isAdmin !== 1) {
          await upsertUserRole(email, dbRole);
        }
        return NextResponse.json({ message: `${label} added`, email });
      } catch (error) {
        logger.error({ err: error }, `${label} add error`);
        return NextResponse.json(
          { error: `Failed to add ${label.toLowerCase()}` },
          { status: 500 },
        );
      }
    },
    { bodySchema: emailSchema },
  );

  const DELETE = createAdminRoute(
    async ({ body }) => {
      try {
        const { email } = body;
        await kv.srem(REDIS_KEYS[redisKey], email);
        const isAdmin = await kv.sismember(REDIS_KEYS.ADMIN_USERS, email);
        if (isAdmin !== 1) {
          const isEditor = await kv.sismember(REDIS_KEYS.ADMIN_EDITORS, email);
          await upsertUserRole(
            email,
            dbRole === "ADMIN" && isEditor === 1 ? "EDITOR" : "USER",
          );
        }
        return NextResponse.json({ message: `${label} removed`, email });
      } catch (error) {
        logger.error({ err: error }, `${label} remove error`);
        return NextResponse.json(
          { error: `Failed to remove ${label.toLowerCase()}` },
          { status: 500 },
        );
      }
    },
    { bodySchema: emailSchema },
  );

  return { GET, POST, DELETE };
}

import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";
import { createAdminRoute } from "@/lib/api-middleware";
import { kv } from "@/lib/kv";
import { db } from "@/lib/db";
import { z } from "zod";

const FOLDERS_WITH_ACCESS_KEY = "zee-index:user-access:folders";
const getFolderAccessKey = (folderId: string) => `folder:access:${folderId}`;

const accessSchema = z.object({
  folderId: z.string().min(5, "Invalid folder ID."),
  email: z
    .string()
    .email("Invalid email format.")
    .transform((v) => v.toLowerCase().trim()),
});

export const dynamic = "force-dynamic";

export const GET = createAdminRoute(async () => {
  try {
    // Prefer durable Postgres ACL; fall back to Redis if empty.
    const rows = await db.folderAccess.findMany({
      select: { folderId: true, email: true },
      orderBy: { createdAt: "asc" },
    });

    const permissions: Record<string, string[]> = {};
    for (const row of rows) {
      if (!permissions[row.folderId]) permissions[row.folderId] = [];
      permissions[row.folderId].push(row.email);
    }

    if (Object.keys(permissions).length === 0) {
      const folderIds: string[] = await kv.smembers(FOLDERS_WITH_ACCESS_KEY);
      for (const folderId of folderIds) {
        const emails: string[] = await kv.smembers(
          getFolderAccessKey(folderId),
        );
        if (emails.length > 0) {
          permissions[folderId] = emails;
        }
      }
    }

    return NextResponse.json(permissions);
  } catch (error) {
    logger.error({ err: error }, "Failed to fetch folder access");
    return NextResponse.json(
      { error: "Failed to fetch access data." },
      { status: 500 },
    );
  }
});

export const POST = createAdminRoute(
  async ({ body }) => {
    try {
      const { folderId, email } = body;

      await db.folderAccess.upsert({
        where: { folderId_email: { folderId, email } },
        create: { folderId, email },
        update: {},
      });

      await kv.sadd(FOLDERS_WITH_ACCESS_KEY, folderId);
      await kv.sadd(getFolderAccessKey(folderId), email);

      return NextResponse.json({
        success: true,
        message: `Access for ${email} to folder ${folderId} has been granted.`,
      });
    } catch (error) {
      logger.error({ err: error }, "Failed to grant folder access");
      return NextResponse.json(
        { error: "Failed to process request." },
        { status: 500 },
      );
    }
  },
  { bodySchema: accessSchema },
);

export const DELETE = createAdminRoute(
  async ({ body }) => {
    try {
      const { folderId, email } = body;

      await db.folderAccess
        .delete({
          where: { folderId_email: { folderId, email } },
        })
        .catch((err) =>
          logger.warn(
            { err, folderId, email },
            "FolderAccess row missing on delete",
          ),
        );

      await kv.srem(getFolderAccessKey(folderId), email);

      const remainingEmails = await kv.scard(getFolderAccessKey(folderId));
      if (remainingEmails === 0) {
        await kv.srem(FOLDERS_WITH_ACCESS_KEY, folderId);
      }

      return NextResponse.json({
        success: true,
        message: `Access for ${email} to folder ${folderId} has been revoked.`,
      });
    } catch (error) {
      logger.error({ err: error }, "Failed to revoke folder access");
      return NextResponse.json(
        { error: "Failed to process request." },
        { status: 500 },
      );
    }
  },
  { bodySchema: accessSchema },
);

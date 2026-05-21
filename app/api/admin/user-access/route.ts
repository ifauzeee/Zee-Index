import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";
import { createAdminRoute } from "@/lib/api-middleware";
import { kv } from "@/lib/kv";
import { z } from "zod";

const FOLDERS_WITH_ACCESS_KEY = "zee-index:user-access:folders";
const getFolderAccessKey = (folderId: string) => `folder:access:${folderId}`;

const accessSchema = z.object({
  folderId: z.string().min(5, "Folder ID tidak valid."),
  email: z.string().email("Format email tidak valid."),
});

export const dynamic = "force-dynamic";

export const GET = createAdminRoute(async () => {
  try {
    const folderIds: string[] = await kv.smembers(FOLDERS_WITH_ACCESS_KEY);
    const permissions: Record<string, string[]> = {};

    for (const folderId of folderIds) {
      const emails: string[] = await kv.smembers(getFolderAccessKey(folderId));
      if (emails.length > 0) {
        permissions[folderId] = emails;
      }
    }

    return NextResponse.json(permissions);
  } catch {
    return NextResponse.json(
      { error: "Gagal mengambil data." },
      { status: 500 },
    );
  }
});

export const POST = createAdminRoute(
  async ({ body }) => {
    try {
      const { folderId, email } = body;

      await kv.sadd(FOLDERS_WITH_ACCESS_KEY, folderId);
      await kv.sadd(getFolderAccessKey(folderId), email);

      return NextResponse.json({
        success: true,
        message: `Akses untuk ${email} ke folder ${folderId} telah ditambahkan.`,
      });
    } catch (error) {
      logger.error({ err: error }, "Gagal menambah akses pengguna");
      return NextResponse.json(
        { error: "Gagal memproses permintaan." },
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

      await kv.srem(getFolderAccessKey(folderId), email);

      const remainingEmails = await kv.scard(getFolderAccessKey(folderId));
      if (remainingEmails === 0) {
        await kv.srem(FOLDERS_WITH_ACCESS_KEY, folderId);
      }

      return NextResponse.json({
        success: true,
        message: `Akses untuk ${email} dari folder ${folderId} telah dihapus.`,
      });
    } catch (error) {
      logger.error({ err: error }, "Gagal menghapus akses pengguna");
      return NextResponse.json(
        { error: "Gagal memproses permintaan." },
        { status: 500 },
      );
    }
  },
  { bodySchema: accessSchema },
);

import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";
import { createAdminRoute } from "@/lib/api-middleware";
import { db } from "@/lib/db";
import { z } from "zod";
import bcrypt from "bcryptjs";

const sanitizeString = (str: string) => str.replace(/<[^>]*>?/gm, "");

const folderSchema = z.object({
  folderId: z
    .string()
    .min(5, "Folder ID tidak valid.")
    .transform((val) => sanitizeString(val).trim()),
  id: z
    .string()
    .optional()
    .transform((val) => (val ? sanitizeString(val) : "admin")),
  password: z.string().min(1, "Password tidak boleh kosong."),
});

const folderDeleteSchema = z.object({
  folderId: z
    .string()
    .min(1, "Folder ID diperlukan.")
    .transform((v) => v.trim()),
});

export const dynamic = "force-dynamic";

export const GET = createAdminRoute(async () => {
  try {
    const folders = await db.protectedFolder.findMany();

    const sanitizedFolders: Record<string, any> = {};
    if (folders) {
      folders.forEach((folder: { folderId: string }) => {
        sanitizedFolders[folder.folderId] = {
          id: "admin",
          password: "***REDACTED***",
        };
      });
    }

    return NextResponse.json(sanitizedFolders);
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
      const validation = folderSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json(
          { error: validation.error.issues[0].message },
          { status: 400 },
        );
      }

      const { folderId, password } = validation.data;
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      await db.protectedFolder.upsert({
        where: { folderId },
        update: { password: hashedPassword },
        create: { folderId, password: hashedPassword },
      });

      return NextResponse.json({
        success: true,
        message: `Folder ${folderId} berhasil dilindungi.`,
      });
    } catch (error) {
      logger.error({ err: error }, "Gagal menambah folder terproteksi");
      return NextResponse.json(
        { error: "Gagal memproses permintaan." },
        { status: 500 },
      );
    }
  },
  { bodySchema: folderSchema },
);

export const DELETE = createAdminRoute(
  async ({ body }) => {
    try {
      const { folderId } = body;

      await db.protectedFolder
        .delete({
          where: { folderId },
        })
        .catch(() => {});

      return NextResponse.json({
        success: true,
        message: `Perlindungan untuk folder ${folderId} telah dihapus.`,
      });
    } catch (error) {
      logger.error({ err: error }, "Gagal menghapus folder terproteksi");
      return NextResponse.json(
        { error: "Gagal memproses permintaan." },
        { status: 500 },
      );
    }
  },
  { bodySchema: folderDeleteSchema },
);

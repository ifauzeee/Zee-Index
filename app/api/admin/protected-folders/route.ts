import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";
import { z } from "zod";
import bcrypt from "bcryptjs";

import { type Session } from "next-auth";

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

async function isAdmin(session: Session | null): Promise<boolean> {
  return session?.user?.role === "ADMIN";
}

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!(await isAdmin(session))) {
    return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
  }
  try {
    const folders = await db.protectedFolder.findMany();

    const sanitizedFolders: Record<string, any> = {};
    if (folders) {
      folders.forEach((folder) => {
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
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!(await isAdmin(session))) {
    return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
  }

  try {
    const body = await request.json();
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
    console.error("Gagal menambah folder terproteksi:", error);
    return NextResponse.json(
      { error: "Gagal memproses permintaan." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!(await isAdmin(session))) {
    return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
  }
  try {
    const { folderId } = await request.json();
    if (!folderId) {
      return NextResponse.json(
        { error: "Folder ID diperlukan." },
        { status: 400 },
      );
    }

    await db.protectedFolder
      .delete({
        where: { folderId: folderId.trim() },
      })
      .catch(() => {});

    return NextResponse.json({
      success: true,
      message: `Perlindungan untuk folder ${folderId} telah dihapus.`,
    });
  } catch (error) {
    console.error("Gagal menghapus folder terproteksi:", error);
    return NextResponse.json(
      { error: "Gagal memproses permintaan." },
      { status: 500 },
    );
  }
}

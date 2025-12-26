import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { kv } from "@/lib/kv";
import { z } from "zod";

import { type Session } from "next-auth";

const FOLDERS_WITH_ACCESS_KEY = "zee-index:user-access:folders";
const getFolderAccessKey = (folderId: string) => `folder:access:${folderId}`;

const accessSchema = z.object({
  folderId: z.string().min(5, "Folder ID tidak valid."),
  email: z.string().email("Format email tidak valid."),
});

async function isAdmin(session: Session | null): Promise<boolean> {
  return session?.user?.role === "ADMIN";
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!(await isAdmin(session))) {
    return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
  }

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
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!(await isAdmin(session))) {
    return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
  }

  try {
    const body = await request.json();
    const validation = accessSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 },
      );
    }

    const { folderId, email } = validation.data;

    await kv.sadd(FOLDERS_WITH_ACCESS_KEY, folderId);
    await kv.sadd(getFolderAccessKey(folderId), email);

    return NextResponse.json({
      success: true,
      message: `Akses untuk ${email} ke folder ${folderId} telah ditambahkan.`,
    });
  } catch (error) {
    console.error("Gagal menambah akses pengguna:", error);
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
    const body = await request.json();
    const validation = accessSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 },
      );
    }

    const { folderId, email } = validation.data;

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
    console.error("Gagal menghapus akses pengguna:", error);
    return NextResponse.json(
      { error: "Gagal memproses permintaan." },
      { status: 500 },
    );
  }
}

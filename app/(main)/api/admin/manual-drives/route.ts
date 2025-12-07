import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { kv } from "@vercel/kv";
import { z } from "zod";
import bcrypt from "bcryptjs";

const MANUAL_DRIVES_KEY = "zee-index:manual-drives";
const PROTECTED_FOLDERS_KEY = "zee-index:protected-folders";

const driveSchema = z.object({
  id: z
    .string()
    .min(1, "ID Folder diperlukan.")
    .transform((val) => val.trim()),
  name: z.string().min(1, "Nama Folder diperlukan."),
  password: z.string().optional(),
});

async function isAdmin() {
  const session = await getServerSession(authOptions);
  return session?.user?.role === "ADMIN";
}

export async function GET() {
  try {
    const drives = (await kv.get(MANUAL_DRIVES_KEY)) || [];
    return NextResponse.json(drives);
  } catch (error) {
    console.error("Failed to fetch manual drives:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const validation = driveSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 },
      );
    }

    const { id, name, password } = validation.data;

    const currentDrives: any[] = (await kv.get(MANUAL_DRIVES_KEY)) || [];

    if (currentDrives.some((d) => d.id === id)) {
      return NextResponse.json(
        { error: "Folder ID ini sudah ada dalam daftar." },
        { status: 400 },
      );
    }

    let isProtected = false;
    if (password && password.trim() !== "") {
      const hashedPassword = await bcrypt.hash(password, 10);
      await kv.hset(PROTECTED_FOLDERS_KEY, {
        [id]: { id: "admin", password: hashedPassword },
      });
      isProtected = true;
    }

    const newDrive = { id, name, isProtected };
    const updatedDrives = [...currentDrives, newDrive];

    await kv.set(MANUAL_DRIVES_KEY, updatedDrives);

    return NextResponse.json({ success: true, drives: updatedDrives });
  } catch (error) {
    console.error("Failed to create manual drive:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { id } = await req.json();
    if (!id)
      return NextResponse.json({ error: "ID required" }, { status: 400 });

    const currentDrives: any[] = (await kv.get(MANUAL_DRIVES_KEY)) || [];
    const updatedDrives = currentDrives.filter((d) => d.id !== id);

    await kv.set(MANUAL_DRIVES_KEY, updatedDrives);

    await kv.hdel(PROTECTED_FOLDERS_KEY, id);

    return NextResponse.json({ success: true, drives: updatedDrives });
  } catch (error) {
    console.error("Failed to delete manual drive:", error);
    return NextResponse.json({ error: "Gagal menghapus" }, { status: 500 });
  }
}

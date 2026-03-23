import { NextResponse } from "next/server";
import { createAdminRoute } from "@/lib/api-middleware";
import { kv } from "@/lib/kv";
import bcrypt from "bcryptjs";

import { db } from "@/lib/db";
import {
  MANUAL_DRIVES_KEY,
  manualDriveCreateSchema,
  manualDriveDeleteSchema,
  parseManualDriveRecords,
} from "@/lib/manual-drives";

export const dynamic = "force-dynamic";

export const GET = createAdminRoute(async () => {
  try {
    const drives = parseManualDriveRecords(await kv.get(MANUAL_DRIVES_KEY));
    return NextResponse.json(drives);
  } catch (error) {
    console.error("Failed to fetch manual drives:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data" },
      { status: 500 },
    );
  }
});

export const POST = createAdminRoute(
  async ({ body }) => {
    try {
      const { id, name, password } = body;
      const currentDrives = parseManualDriveRecords(
        await kv.get(MANUAL_DRIVES_KEY),
      );

      if (currentDrives.some((d) => d.id === id)) {
        return NextResponse.json(
          { error: "Folder ID ini sudah ada dalam daftar." },
          { status: 400 },
        );
      }

      let isProtected = false;
      if (password && password.trim() !== "") {
        const hashedPassword = await bcrypt.hash(password, 10);
        await db.protectedFolder.upsert({
          where: { folderId: id },
          update: { password: hashedPassword },
          create: { folderId: id, password: hashedPassword },
        });
        isProtected = true;
      }

      const newDrive = { id, name, isProtected };
      const updatedDrives = [...currentDrives, newDrive];

      await kv.set(MANUAL_DRIVES_KEY, updatedDrives);

      await kv.del(`zee-index:folder-path-v7:${id}`);

      return NextResponse.json({ success: true, drives: updatedDrives });
    } catch (error) {
      console.error("Failed to create manual drive:", error);
      return NextResponse.json(
        { error: "Internal Server Error" },
        { status: 500 },
      );
    }
  },
  { bodySchema: manualDriveCreateSchema },
);

export const DELETE = createAdminRoute(
  async ({ body }) => {
    try {
      const { id } = body;

      const currentDrives = parseManualDriveRecords(
        await kv.get(MANUAL_DRIVES_KEY),
      );
      const updatedDrives = currentDrives.filter((d) => d.id !== id);

      await kv.set(MANUAL_DRIVES_KEY, updatedDrives);
      await db.protectedFolder
        .delete({
          where: { folderId: id },
        })
        .catch(() => {});

      await kv.del(`zee-index:folder-path-v7:${id}`);

      return NextResponse.json({ success: true, drives: updatedDrives });
    } catch (error) {
      console.error("Failed to delete manual drive:", error);
      return NextResponse.json({ error: "Gagal menghapus" }, { status: 500 });
    }
  },
  { bodySchema: manualDriveDeleteSchema },
);

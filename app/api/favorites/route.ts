import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { kv } from "@/lib/kv";
import { db } from "@/lib/db";
import { DriveFile, getFileDetailsFromDrive } from "@/lib/drive";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Akses ditolak." }, { status: 401 });
  }

  try {
    const userFavoritesKey = `user:${session.user.email}:favorites`;
    const favoriteIds: string[] = await kv.smembers(userFavoritesKey);
    const validFavoriteIds = favoriteIds.filter((id) => id);

    if (validFavoriteIds.length === 0) {
      return NextResponse.json([]);
    }

    const detailPromises = validFavoriteIds.map(async (id) => {
      const detail = await getFileDetailsFromDrive(id);
      if (!detail) {
        await kv.srem(userFavoritesKey, id);
      }
      return detail;
    });

    const [results, allProtectedFolders, isPrivFolder] = await Promise.all([
      Promise.all(detailPromises),
      db.protectedFolder
        .findMany({ select: { folderId: true } })
        .then((res: { folderId: string }[]) => {
          const map: Record<string, boolean> = {};
          res.forEach((r: { folderId: string }) => (map[r.folderId] = true));
          return map;
        }),
      import("@/lib/auth").then((m) => m.isPrivateFolder),
    ]);

    const allFiles: DriveFile[] = results.filter(
      (file: DriveFile | null): file is DriveFile =>
        file !== null && !file.trashed,
    );

    const validFiles = allFiles.map((file) => {
      const fileId = file.id as string;
      const isProt = !!(allProtectedFolders as any)[fileId];
      const isPriv = isPrivFolder(fileId);
      return {
        ...file,
        isFolder: file.mimeType === "application/vnd.google-apps.folder",
        isProtected: isProt || isPriv,
      };
    });

    return NextResponse.json(validFiles);
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Terjadi kesalahan tidak dikenal.";
    console.error("Get Favorites API Error:", errorMessage);
    return NextResponse.json(
      { error: errorMessage || "Internal Server Error." },
      { status: 500 },
    );
  }
}

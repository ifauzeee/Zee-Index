import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { kv } from "@/lib/kv";
import { DriveFile, getFileDetailsFromDrive } from "@/lib/googleDrive";

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

    const results = await Promise.all(detailPromises);

    const allFiles: DriveFile[] = results.filter(
      (file): file is DriveFile => file !== null && !file.trashed,
    );

    const validFiles = allFiles.map((file) => ({
      ...file,
      isFolder: file.mimeType === "application/vnd.google-apps.folder",
    }));

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

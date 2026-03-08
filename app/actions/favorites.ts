"use server";

import { kv } from "@/lib/kv";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { DriveFile, getFileDetailsFromDrive } from "@/lib/drive";
import { revalidateTag } from "next/cache";

export async function getFavorites() {
  const session = await auth();
  if (!session?.user?.email) {
    throw new Error("Akses ditolak.");
  }

  const userFavoritesKey = `user:${session.user.email}:favorites`;
  const favoriteIds: string[] = await kv.smembers(userFavoritesKey);
  const validFavoriteIds = favoriteIds.filter((id) => id);

  if (validFavoriteIds.length === 0) {
    return [];
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

  return validFiles;
}

export async function addFavorite(fileId: string) {
  const session = await auth();
  if (!session?.user?.email) {
    throw new Error("Akses ditolak.");
  }

  if (!fileId) {
    throw new Error("fileId diperlukan.");
  }

  const userFavoritesKey = `user:${session.user.email}:favorites`;
  await kv.sadd(userFavoritesKey, fileId);
  revalidateTag(`favorites`, "max");

  return { success: true, message: "Ditambahkan ke favorit." };
}

export async function removeFavorite(fileId: string) {
  const session = await auth();
  if (!session?.user?.email) {
    throw new Error("Akses ditolak.");
  }

  if (!fileId) {
    throw new Error("fileId diperlukan.");
  }

  const userFavoritesKey = `user:${session.user.email}:favorites`;
  await kv.srem(userFavoritesKey, fileId);
  revalidateTag(`favorites`, "max");

  return { success: true, message: "Dihapus dari favorit." };
}

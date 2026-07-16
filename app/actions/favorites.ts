"use server";

import { kv } from "@/lib/kv";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { DriveFile, getFileDetailsFromDrive } from "@/lib/drive";
import { revalidateTag } from "next/cache";
import { getTranslations } from "next-intl/server";

const FAVORITES_MAX_ITEMS = 200;
const FAVORITES_BATCH_SIZE = 10;

/** Process items in sequential batches with concurrent execution per batch. */
async function batchDriveFetch<T>(
  items: string[],
  batchSize: number,
  fn: (id: string) => Promise<T>,
): Promise<T[]> {
  const results: T[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(fn));
    results.push(...batchResults);
  }
  return results;
}

export async function getFavorites() {
  const t = await getTranslations("ServerActions");
  const session = await auth();
  if (!session?.user?.email) {
    throw new Error(t("accessDenied"));
  }

  const userFavoritesKey = `user:${session.user.email}:favorites`;
  const favoriteIds: string[] = await kv.smembers(userFavoritesKey);
  const validFavoriteIds = favoriteIds.filter((id) => id);

  if (validFavoriteIds.length === 0) {
    return [];
  }

  // Cap to prevent runaway Drive API usage
  if (validFavoriteIds.length > FAVORITES_MAX_ITEMS) {
    validFavoriteIds.length = FAVORITES_MAX_ITEMS;
  }

  const [results, allProtectedFolders, isPrivFolder] = await Promise.all([
    // Fetch file details in concurrent batches to avoid rate-limit spikes
    batchDriveFetch(validFavoriteIds, FAVORITES_BATCH_SIZE, async (id) => {
      const detail = await getFileDetailsFromDrive(id);
      if (!detail) {
        await kv.srem(userFavoritesKey, id);
      }
      return detail;
    }),
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
    const fileId = file.id;
    const isProt = !!allProtectedFolders[fileId];
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
  const t = await getTranslations("ServerActions");
  const session = await auth();
  if (!session?.user?.email) {
    throw new Error(t("accessDenied"));
  }

  if (!fileId) {
    throw new Error(t("fileIdRequired"));
  }

  const userFavoritesKey = `user:${session.user.email}:favorites`;
  await kv.sadd(userFavoritesKey, fileId);
  revalidateTag(`favorites`, "max");

  return { success: true, message: t("addedToFavorites") };
}

export async function removeFavorite(fileId: string) {
  const t = await getTranslations("ServerActions");
  const session = await auth();
  if (!session?.user?.email) {
    throw new Error(t("accessDenied"));
  }

  if (!fileId) {
    throw new Error(t("fileIdRequired"));
  }

  const userFavoritesKey = `user:${session.user.email}:favorites`;
  await kv.srem(userFavoritesKey, fileId);
  revalidateTag(`favorites`, "max");

  return { success: true, message: t("removedFromFavorites") };
}

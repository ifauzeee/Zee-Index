"use server";

import { kv } from "@/lib/kv";
import { auth } from "@/auth";
import { getFileDetailsFromDrive, DriveFile } from "@/lib/drive";
import { z } from "zod";
import { revalidateTag } from "next/cache";
import { getTranslations } from "next-intl/server";

const PINNED_KEY = "zee-index:pinned-folders";

const pinSchema = z.object({
  folderId: z.string().min(1),
});

export async function getPinnedFolders() {
  const pinnedIds: string[] = await kv.smembers(PINNED_KEY);

  if (!pinnedIds || pinnedIds.length === 0) {
    return [];
  }

  const promises = pinnedIds.map(async (id) => {
    const detail = await getFileDetailsFromDrive(id);
    if (!detail) {
      await kv.srem(PINNED_KEY, id);
    }
    return detail;
  });
  const results = await Promise.all(promises);

  const pinnedFolders = results.filter(
    (file): file is DriveFile =>
      file !== null && !file.trashed && file.isFolder,
  );

  return pinnedFolders;
}

export async function addPin(folderId: string) {
  const t = await getTranslations("ServerActions");
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    throw new Error(t("unauthorized"));
  }

  const validation = pinSchema.safeParse({ folderId });
  if (!validation.success) {
    throw new Error(t("invalidInput"));
  }

  await kv.sadd(PINNED_KEY, validation.data.folderId);
  revalidateTag("pinned", "max");

  return { success: true, message: t("folderPinned") };
}

export async function removePin(folderId: string) {
  const t = await getTranslations("ServerActions");
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    throw new Error(t("unauthorized"));
  }

  if (!folderId) {
    throw new Error(t("folderIdRequired"));
  }

  await kv.srem(PINNED_KEY, folderId);
  revalidateTag("pinned", "max");

  return { success: true, message: t("pinRemoved") };
}

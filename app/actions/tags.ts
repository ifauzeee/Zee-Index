"use server";

import { kv } from "@/lib/kv";
import { revalidateTag } from "next/cache";
import { getTranslations } from "next-intl/server";

const TAGS_PREFIX = "zee_tags:";

export async function getTags(fileId: string) {
  const t = await getTranslations("ServerActions");
  if (!fileId) throw new Error(t("missingFileId"));

  const tags = await kv.smembers(`${TAGS_PREFIX}${fileId}`);
  return { tags: tags || [] };
}

export async function addTag(fileId: string, tag: string) {
  const t = await getTranslations("ServerActions");
  if (!fileId || !tag) throw new Error(t("missingData"));

  const key = `${TAGS_PREFIX}${fileId}`;
  await kv.sadd(key, tag);

  revalidateTag(`tags:${fileId}`, "max");
  return { success: true };
}

export async function removeTag(fileId: string, tag: string) {
  const t = await getTranslations("ServerActions");
  if (!fileId || !tag) throw new Error(t("missingData"));

  const key = `${TAGS_PREFIX}${fileId}`;
  await kv.srem(key, tag);

  revalidateTag(`tags:${fileId}`, "max");
  return { success: true };
}

"use server";

import { kv } from "@/lib/kv";
import { revalidateTag } from "next/cache";

const TAGS_PREFIX = "zee_tags:";

export async function getTags(fileId: string) {
  if (!fileId) throw new Error("Missing fileId");

  const tags = await kv.smembers(`${TAGS_PREFIX}${fileId}`);
  return { tags: tags || [] };
}

export async function addTag(fileId: string, tag: string) {
  if (!fileId || !tag) throw new Error("Missing data");

  const key = `${TAGS_PREFIX}${fileId}`;
  await kv.sadd(key, tag);

  revalidateTag(`tags:${fileId}`, "max");
  return { success: true };
}

export async function removeTag(fileId: string, tag: string) {
  if (!fileId || !tag) throw new Error("Missing data");

  const key = `${TAGS_PREFIX}${fileId}`;
  await kv.srem(key, tag);

  revalidateTag(`tags:${fileId}`, "max");
  return { success: true };
}

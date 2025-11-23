import { kv } from "@vercel/kv";

export async function invalidateFolderCache(folderId: string) {
  try {
    const pattern = `folder:content:${folderId}:*`;
    const keys = await kv.keys(pattern);
    if (keys.length > 0) {
      await kv.del(...keys);
    }
  } catch (error) {
    console.error(
      `Gagal melakukan invalidasi cache untuk folder ${folderId}:`,
      error,
    );
  }
}

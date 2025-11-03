import { jwtVerify } from "jose";
import { kv } from "@vercel/kv";

const privateFolderIds = (process.env.PRIVATE_FOLDER_IDS || "")
  .split(",")
  .map((id) => id.trim())
  .filter((id) => id);

export function isPrivateFolder(folderId: string): boolean {
  return privateFolderIds.includes(folderId);
}

export async function isProtected(folderId: string): Promise<boolean> {
  try {
    const protectedFolders = await kv.hgetall("zee-index:protected-folders");
    return protectedFolders ? !!protectedFolders[folderId] : false;
  } catch (e) {
    console.error("Gagal memeriksa folder terproteksi dari KV:", e);
    return true;
  }
}

export async function getProtectedFolderCredentials(
  folderId: string,
): Promise<{ id: string; password: string } | null> {
  try {
    const credentials = await kv.hget<{ id: string; password: string }>(
      `zee-index:protected-folders`,
      folderId,
    );
    return credentials;
  } catch (error) {
    console.error("Gagal mengambil kredensial folder:", error);
    return null;
  }
}

export async function verifyFolderToken(
  token: string,
  requestedFolderId: string,
): Promise<boolean> {
  if (!token) return false;
  try {
    const secret = new TextEncoder().encode(process.env.SHARE_SECRET_KEY!);
    const { payload } = await jwtVerify(token, secret);
    return payload.folderId === requestedFolderId;
  } catch (error) {
    console.error("Verifikasi token folder gagal:", error);
    return false;
  }
}

export function isGuestUser(token: any): boolean {
  return token?.isGuest === true;
}

export async function hasUserAccess(
  email: string,
  folderId: string,
): Promise<boolean> {
  try {
    const result = await kv.sismember(`folder:access:${folderId}`, email);
    return result === 1;
  } catch (error) {
    console.error("Gagal memeriksa akses folder pengguna:", error);
    return false;
  }
}
import { jwtVerify } from "jose";
import { kv } from "@vercel/kv";
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";

const privateFolderIds = (process.env.PRIVATE_FOLDER_IDS || "")
  .split(",")
  .map((id) => id.trim())
  .filter((id) => id);

export function isPrivateFolder(folderId: string): boolean {
  if (!folderId) return false;
  return privateFolderIds.includes(folderId.trim());
}

export async function isProtected(folderId: string): Promise<boolean> {
  if (!folderId) return false;
  try {
    const targetId = folderId.trim();
    const protectedFolders = await kv.hgetall("zee-index:protected-folders");

    if (!protectedFolders) return false;

    if (protectedFolders[targetId]) return true;

    const keys = Object.keys(protectedFolders);
    return keys.some((key) => key.trim() === targetId);
  } catch (error) {
    console.error("Error checking protected status:", error);
    return true;
  }
}

export async function getProtectedFolderCredentials(
  folderId: string,
): Promise<{ id: string; password: string } | null> {
  if (!folderId) return null;
  try {
    const targetId = folderId.trim();
    const protectedFolders = await kv.hgetall("zee-index:protected-folders");

    if (!protectedFolders) return null;

    const foundKey = Object.keys(protectedFolders).find(
      (key) => key.trim() === targetId,
    );

    if (foundKey) {
      return protectedFolders[foundKey] as { id: string; password: string };
    }
    return null;
  } catch (error) {
    console.error("Error getting protected folder credentials:", error);
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
    return payload.folderId === requestedFolderId?.trim();
  } catch {
    return false;
  }
}

export async function hasUserAccess(
  email: string,
  folderId: string,
): Promise<boolean> {
  if (!folderId || !email) return false;
  try {
    const cleanId = folderId.trim();
    const result = await kv.sismember(`folder:access:${cleanId}`, email);
    return result === 1;
  } catch {
    return false;
  }
}

export async function validateShareToken(
  request: NextRequest,
): Promise<boolean> {
  const { searchParams } = new URL(request.url);
  const shareToken = searchParams.get("share_token");
  if (!shareToken) return false;

  try {
    const secret = new TextEncoder().encode(process.env.SHARE_SECRET_KEY!);
    const { payload } = await jwtVerify(shareToken, secret);

    if (typeof payload.jti !== "string") {
      return false;
    }
    const isBlocked = await kv.get(`zee-index:blocked:${payload.jti}`);
    if (isBlocked) {
      return false;
    }

    if (payload.loginRequired) {
      const session = await getServerSession(authOptions);
      return !!session;
    }
    return true;
  } catch {
    return false;
  }
}

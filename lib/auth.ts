import { jwtVerify } from 'jose';

// --- LOGIKA FOLDER PRIVAT ---
const privateFolderIds = (process.env.PRIVATE_FOLDER_IDS || '')
  .split(',')
  .map(id => id.trim())
  .filter(id => id);

export function isPrivateFolder(folderId: string): boolean {
  return privateFolderIds.includes(folderId);
}

// --- LOGIKA FOLDER TERKUNCI ---
export function isProtected(folderId: string): boolean {
  const protectedFoldersConfig = process.env.PROTECTED_FOLDERS_JSON;
  if (!protectedFoldersConfig) return false;
  try {
    // Ganti placeholder env sebelum parsing untuk keamanan
    const configString = protectedFoldersConfig
      .replace('${USER1_ID}', process.env.USER1_ID || '')
      .replace('${USER1_PASS}', process.env.USER1_PASS || '');
      
    const protectedFolders = JSON.parse(configString);
    return !!protectedFolders[folderId];
  } catch (e) {
    console.error("Gagal mem-parsing PROTECTED_FOLDERS_JSON:", e);
    return false;
  }
}

export async function verifyFolderToken(token: string, requestedFolderId: string): Promise<boolean> {
  if (!token) return false;
  try {
    const secret = new TextEncoder().encode(process.env.SHARE_SECRET_KEY!);
    const { payload } = await jwtVerify(token, secret);
    // Pastikan token ini untuk folder yang diminta
    return payload.folderId === requestedFolderId;
  } catch (error) {
    console.error("Verifikasi token folder gagal:", error);
    return false;
  }
}
import { kv } from "@/lib/kv";

export interface AppCredentials {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  rootFolderId: string;
}

export async function getAppCredentials(): Promise<AppCredentials | null> {
  if (process.env.GOOGLE_REFRESH_TOKEN) {
    return {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      refreshToken: process.env.GOOGLE_REFRESH_TOKEN!,
      rootFolderId: process.env.NEXT_PUBLIC_ROOT_FOLDER_ID!,
    };
  }

  try {
    const storedConfig = await kv.get<AppCredentials>("zee-index:credentials");
    if (storedConfig) {
      return storedConfig;
    }
  } catch (error) {
    console.error("Gagal membaca config KV:", error);
  }

  return null;
}

export async function isAppConfigured(): Promise<boolean> {
  const creds = await getAppCredentials();
  return !!creds;
}

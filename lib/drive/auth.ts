import { kv } from "@/lib/kv";
import { getAppCredentials } from "@/lib/config";

const ACCESS_TOKEN_KEY = "google:access-token";

export async function invalidateAccessToken() {
  await kv.del(ACCESS_TOKEN_KEY);
}

export async function getAccessToken(): Promise<string> {
  try {
    const cachedToken: string | null = await kv.get(ACCESS_TOKEN_KEY);
    if (cachedToken) {
      return cachedToken;
    }
  } catch (e) {
    console.error(e);
  }

  const creds = await getAppCredentials();
  if (!creds) {
    throw new Error(
      "Aplikasi belum dikonfigurasi. Silakan jalankan Setup Wizard.",
    );
  }

  const url = "https://oauth2.googleapis.com/token";
  const bodyParams = new URLSearchParams({
    client_id: creds.clientId,
    client_secret: creds.clientSecret,
    refresh_token: creds.refreshToken,
    grant_type: "refresh_token",
  });

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: bodyParams,
    cache: "no-store",
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error("OAuth token refresh failed:", errorData.error);

    if (errorData.error === "invalid_grant") {
      await kv.del("zee-index:credentials");
      throw new Error(
        "Sesi Google Drive kadaluarsa. Silakan lakukan Setup ulang di /setup",
      );
    }

    throw new Error(errorData.error_description || "Otentikasi Gagal");
  }

  const tokenData: { access_token: string; expires_in: number } =
    await response.json();

  try {
    await kv.set(ACCESS_TOKEN_KEY, tokenData.access_token, { ex: 3500 });
  } catch (e) {
    console.error(e);
  }

  return tokenData.access_token;
}

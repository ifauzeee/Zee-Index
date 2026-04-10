import { kv } from "@/lib/kv";
import { getAppCredentials } from "@/lib/config";
import {
  REDIS_KEYS,
  REDIS_TTL,
  ERROR_MESSAGES,
  GOOGLE_OAUTH_TOKEN_URL,
} from "@/lib/constants";
import { logger } from "@/lib/logger";

export async function invalidateAccessToken() {
  await kv.del(REDIS_KEYS.ACCESS_TOKEN);
}

export async function getAccessToken(): Promise<string> {
  const creds = await getAppCredentials();
  if (!creds) {
    throw new Error(ERROR_MESSAGES.APP_NOT_CONFIGURED);
  }

  const dynamicCacheKey = `${REDIS_KEYS.ACCESS_TOKEN}:${creds.refreshToken.substring(0, 10)}`;

  try {
    const cachedToken: string | null = await kv.get(dynamicCacheKey);
    if (cachedToken) {
      return cachedToken;
    }
  } catch (e) {
    logger.error({ err: e }, "Failed to get cached access token");
  }

  const bodyParams = new URLSearchParams({
    client_id: creds.clientId,
    client_secret: creds.clientSecret,
    refresh_token: creds.refreshToken,
    grant_type: "refresh_token",
  });

  const response = await fetch(GOOGLE_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: bodyParams,
    cache: "no-store",
  });

  if (!response.ok) {
    const errorData = await response.json();
    logger.error({ error: errorData.error }, "OAuth token refresh failed");

    if (errorData.error === ERROR_MESSAGES.INVALID_GRANT) {
      throw new Error(ERROR_MESSAGES.SESSION_EXPIRED);
    }

    throw new Error(errorData.error_description || ERROR_MESSAGES.AUTH_FAILED);
  }

  const tokenData: { access_token: string; expires_in: number } =
    await response.json();

  try {
    await kv.set(dynamicCacheKey, tokenData.access_token, {
      ex: REDIS_TTL.ACCESS_TOKEN,
    });
    logger.debug("Access token refreshed successfully");
  } catch (e) {
    logger.error({ err: e }, "Failed to cache access token");
  }

  return tokenData.access_token;
}

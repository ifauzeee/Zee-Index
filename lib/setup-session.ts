import fs from "fs";
import path from "path";
import type { Session } from "next-auth";
import { kv } from "@/lib/kv";
import { logger } from "@/lib/logger";
import { isAppConfigured } from "@/lib/config";
import { announceSetupToken, isValidSetupToken } from "@/lib/setup-token";

const SETUP_ENV_KEYS = [
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "GOOGLE_REFRESH_TOKEN",
  "NEXT_PUBLIC_ROOT_FOLDER_ID",
] as const;

export function envFilePath(): string {
  return path.join(process.cwd(), ".env");
}

export function readEnvFile(): string {
  try {
    const envPath = envFilePath();
    return fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf-8") : "";
  } catch (err) {
    logger.error({ err }, "[Setup] Could not read .env");
    return "";
  }
}

export function hasPersistedSetupConfig(envContent: string): boolean {
  return SETUP_ENV_KEYS.every((key) => {
    const match = envContent.match(new RegExp(`^${key}=(.*)$`, "m"));
    if (!match) return false;

    const value = match[1].trim().replace(/^["']|["']$/g, "");
    return value.length > 0;
  });
}

export function isAllowedSetupRequestOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) {
    return false;
  }

  try {
    const originUrl = new URL(origin);
    const requestUrl = new URL(request.url);
    const host = request.headers.get("host");
    const forwardedHost = request.headers.get("x-forwarded-host");
    const forwardedProto =
      request.headers.get("x-forwarded-proto") ||
      requestUrl.protocol.slice(0, -1);
    const allowedOrigins = new Set([requestUrl.origin]);

    if (host) {
      allowedOrigins.add(`${requestUrl.protocol}//${host}`);
    }

    if (forwardedHost) {
      allowedOrigins.add(`${forwardedProto}://${forwardedHost}`);
    }

    return allowedOrigins.has(originUrl.origin);
  } catch {
    return false;
  }
}

/**
 * Who may run setup: anyone with the setup token while the instance is
 * unconfigured (Z2-26), only admins afterwards. Returns the refusal, or null
 * when allowed.
 */
export async function setupAccessError(
  envContent: string,
  session: Session | null,
  setupToken: string | undefined,
): Promise<{ error: string; status: number } | null> {
  const isConfigured = await isAppConfigured();
  if (isConfigured || hasPersistedSetupConfig(envContent)) {
    return session?.user?.role === "ADMIN"
      ? null
      : { error: "Forbidden", status: 403 };
  }
  if (!isValidSetupToken(setupToken)) {
    announceSetupToken();
    return {
      error:
        'Invalid setup token. Find it in the server log ("[Setup] App is not configured") or set SETUP_TOKEN.',
      status: 403,
    };
  }
  return null;
}

/**
 * Values the admin typed in the wizard, held on the server while the browser
 * visits Google, keyed by the OAuth `state`. The browser only keeps the state,
 * so the client secret and setup token never sit in browser storage.
 */
export interface PendingSetup {
  clientId?: string;
  clientSecret?: string;
  rootFolderId?: string;
  setupToken?: string;
}

const PENDING_PREFIX = "zee-index:setup-pending:";
const PENDING_TTL_SECONDS = 10 * 60;
const STATE_PATTERN = /^[0-9a-f-]{36}$/;

export async function savePendingSetup(values: PendingSetup): Promise<string> {
  const state = crypto.randomUUID();
  await kv.set(`${PENDING_PREFIX}${state}`, values, {
    ex: PENDING_TTL_SECONDS,
  });
  return state;
}

/** Read and delete a pending setup; null when unknown or expired. */
export async function takePendingSetup(
  state: string,
): Promise<PendingSetup | null> {
  if (!STATE_PATTERN.test(state)) return null;
  const key = `${PENDING_PREFIX}${state}`;
  const value = await kv.get<PendingSetup>(key);
  if (!value) return null;
  await kv.del(key);
  return value;
}

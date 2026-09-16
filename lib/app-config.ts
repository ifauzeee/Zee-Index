import { db } from "@/lib/db";
import { kv } from "@/lib/kv";
import bcrypt from "bcryptjs";
import {
  APP_CONFIG_KEY,
  appConfigSchema,
  publicAppConfigSchema,
  DEFAULT_APP_CONFIG,
  type AppConfig,
  type AppConfigUpdate,
  type PublicAppConfig,
} from "@/lib/app-config.shared";
const BCRYPT_HASH_PATTERN = /^\$2[aby]\$\d{2}\$/;

let configWriteLock: Promise<unknown> = Promise.resolve();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function mergeWithDefaults(value: unknown): AppConfig {
  if (!isRecord(value)) {
    return DEFAULT_APP_CONFIG;
  }

  return appConfigSchema.parse({
    ...DEFAULT_APP_CONFIG,
    ...value,
  });
}

function parseStoredConfigValue(value: string | null | undefined): AppConfig {
  if (!value) {
    return DEFAULT_APP_CONFIG;
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    return mergeWithDefaults(parsed);
  } catch {
    return DEFAULT_APP_CONFIG;
  }
}

function parseCachedConfigValue(value: unknown): AppConfig | null {
  if (!isRecord(value)) {
    return null;
  }

  const result = appConfigSchema.safeParse({
    ...DEFAULT_APP_CONFIG,
    ...value,
  });

  return result.success ? result.data : null;
}

export function isHashedLocalStoragePassword(value: string): boolean {
  return BCRYPT_HASH_PATTERN.test(value);
}

export function sanitizeAdminAppConfig(config: AppConfig): AppConfig {
  return {
    ...config,
    localStoragePassword: "",
  };
}

export async function getAppConfig(): Promise<AppConfig> {
  const cached = parseCachedConfigValue(await kv.get(APP_CONFIG_KEY));
  if (cached) {
    return cached;
  }

  const configEntry = await db.adminConfig.findUnique({
    where: { key: APP_CONFIG_KEY },
  });

  const config = parseStoredConfigValue(configEntry?.value);
  await kv.set(APP_CONFIG_KEY, config);

  return config;
}

export async function getPublicAppConfig(): Promise<PublicAppConfig> {
  const config = await getAppConfig();
  return publicAppConfigSchema.parse(config);
}

export async function updateAppConfig(
  update: AppConfigUpdate,
): Promise<AppConfig> {
  const result = configWriteLock.then(() => doUpdate(update));
  configWriteLock = result.catch(() => {});
  return result;
}

async function doUpdate(update: AppConfigUpdate): Promise<AppConfig> {
  const currentConfig = await getAppConfig();
  const normalizedUpdate = { ...update };

  if (typeof normalizedUpdate.localStoragePassword === "string") {
    const trimmedPassword = normalizedUpdate.localStoragePassword.trim();

    if (!trimmedPassword) {
      normalizedUpdate.localStoragePassword = "";
    } else if (!isHashedLocalStoragePassword(trimmedPassword)) {
      normalizedUpdate.localStoragePassword = await bcrypt.hash(
        trimmedPassword,
        10,
      );
    } else {
      normalizedUpdate.localStoragePassword = trimmedPassword;
    }
  }

  const nextConfig = appConfigSchema.parse({
    ...currentConfig,
    ...normalizedUpdate,
  });

  await db.adminConfig.upsert({
    where: { key: APP_CONFIG_KEY },
    update: { value: JSON.stringify(nextConfig) },
    create: { key: APP_CONFIG_KEY, value: JSON.stringify(nextConfig) },
  });

  await kv.set(APP_CONFIG_KEY, nextConfig);

  return nextConfig;
}

export {
  APP_CONFIG_KEY,
  appConfigSchema,
  appConfigUpdateSchema,
  publicAppConfigSchema,
  DEFAULT_APP_CONFIG,
} from "@/lib/app-config.shared";
export type { AppConfig, AppConfigUpdate, PublicAppConfig };

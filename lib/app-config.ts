import { z } from "zod";
import { db } from "@/lib/db";
import { kv } from "@/lib/kv";

export const APP_CONFIG_KEY = "zee-index:config";
const DEFAULT_APP_NAME = "Zee Index";

const emptyUrl = z.literal("");
const relativeUrl = z.string().startsWith("/");
const urlString = z.union([z.string().url(), relativeUrl]);
const colorHex = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export const appConfigSchema = z.object({
  hideAuthor: z.boolean().default(false),
  disableGuestLogin: z.boolean().default(false),
  appName: z
    .string()
    .trim()
    .max(80)
    .transform((value) => value || DEFAULT_APP_NAME)
    .default(DEFAULT_APP_NAME),
  logoUrl: z.union([emptyUrl, urlString]).default(""),
  faviconUrl: z.union([emptyUrl, urlString]).default(""),
  primaryColor: z
    .string()
    .trim()
    .refine((value) => value === "" || colorHex.test(value), {
      message: "Primary color must be an empty string or a valid hex color.",
    })
    .default(""),
});

export const appConfigUpdateSchema = appConfigSchema.partial();

export const publicAppConfigSchema = appConfigSchema.pick({
  disableGuestLogin: true,
  hideAuthor: true,
});

export type AppConfig = z.infer<typeof appConfigSchema>;
export type AppConfigUpdate = z.infer<typeof appConfigUpdateSchema>;
export type PublicAppConfig = z.infer<typeof publicAppConfigSchema>;

export const DEFAULT_APP_CONFIG: AppConfig = appConfigSchema.parse({});

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
  const currentConfig = await getAppConfig();
  const nextConfig = appConfigSchema.parse({
    ...currentConfig,
    ...update,
  });

  await db.adminConfig.upsert({
    where: { key: APP_CONFIG_KEY },
    update: { value: JSON.stringify(nextConfig) },
    create: { key: APP_CONFIG_KEY, value: JSON.stringify(nextConfig) },
  });

  await kv.set(APP_CONFIG_KEY, nextConfig);

  return nextConfig;
}

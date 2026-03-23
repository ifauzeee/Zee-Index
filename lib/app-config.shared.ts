import { z } from "zod";

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

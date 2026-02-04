import { z } from "zod";

const envSchema = z.object({
  GOOGLE_CLIENT_ID: z.string().min(1, "GOOGLE_CLIENT_ID is required"),
  GOOGLE_CLIENT_SECRET: z.string().min(1, "GOOGLE_CLIENT_SECRET is required"),
  NEXT_PUBLIC_ROOT_FOLDER_ID: z
    .string()
    .min(1, "NEXT_PUBLIC_ROOT_FOLDER_ID is required"),

  NEXTAUTH_SECRET: z
    .string()
    .min(32, "NEXTAUTH_SECRET must be at least 32 characters"),
  NEXTAUTH_URL: z.string().url("NEXTAUTH_URL must be a valid URL"),

  SHARE_SECRET_KEY: z
    .string()
    .min(32, "SHARE_SECRET_KEY must be at least 32 characters"),
  ADMIN_EMAILS: z.string().min(1, "ADMIN_EMAILS is required"),
  ADMIN_PASSWORD: z
    .string()
    .min(8, "ADMIN_PASSWORD must be at least 8 characters"),

  KV_REST_API_URL: z.string().url().optional().or(z.literal("")),
  KV_REST_API_TOKEN: z.string().optional().or(z.literal("")),

  GOOGLE_REFRESH_TOKEN: z.string().optional().or(z.literal("")),

  NEXT_PUBLIC_ROOT_FOLDER_NAME: z.string().optional(),
  PRIVATE_FOLDER_IDS: z.string().optional(),
  STORAGE_LIMIT_GB: z.string().optional(),
  STORAGE_WARNING_THRESHOLD: z.string().optional(),
  CRON_SECRET: z.string().optional(),
  WEBHOOK_URL: z.string().url().optional().or(z.literal("")),

  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().optional(),

  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional().or(z.literal("")),
});

export type Env = z.infer<typeof envSchema>;

export interface ValidationResult {
  success: boolean;
  errors: string[];
  warnings: string[];
  config: Partial<Env>;
}

export function validateEnv(): ValidationResult {
  const result: ValidationResult = {
    success: true,
    errors: [],
    warnings: [],
    config: {},
  };

  if (process.env.SKIP_ENV_VALIDATION === "1") {
    return result;
  }

  try {
    const parsed = envSchema.safeParse(process.env);

    if (!parsed.success) {
      result.success = false;
      result.errors = parsed.error.issues.map(
        (e) => `${e.path.join(".")}: ${e.message}`,
      );
    } else {
      result.config = parsed.data;
    }
  } catch (error) {
    result.success = false;
    result.errors.push(`Validation failed: ${String(error)}`);
  }

  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    result.warnings.push(
      "KV_REST_API_URL and KV_REST_API_TOKEN are not set. Using in-memory storage (data will not persist).",
    );
  }

  if (!process.env.WEBHOOK_URL) {
    result.warnings.push(
      "WEBHOOK_URL is not set. System notifications will be disabled.",
    );
  }

  if (!process.env.SMTP_HOST) {
    result.warnings.push(
      "SMTP is not configured. Email features will be disabled.",
    );
  }

  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) {
    result.warnings.push(
      "NEXT_PUBLIC_SENTRY_DSN is not set. Error monitoring is disabled.",
    );
  }

  return result;
}

export function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export function getOptionalEnv(key: string, defaultValue: string = ""): string {
  return process.env[key] || defaultValue;
}

export function isConfigured(): boolean {
  return !!(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.GOOGLE_REFRESH_TOKEN &&
    process.env.NEXT_PUBLIC_ROOT_FOLDER_ID
  );
}

export function needsSetup(): boolean {
  return !process.env.GOOGLE_REFRESH_TOKEN;
}

export function getDatabaseStatus(): "configured" | "memory" | "error" {
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    return "configured";
  }
  return "memory";
}

export function validateOnStartup(): void {
  if (process.env.NODE_ENV === "test") {
    return;
  }

  const result = validateEnv();

  if (!result.success) {
    console.error("\n❌ Environment validation failed:");
    result.errors.forEach((error) => console.error(`   - ${error}`));
    console.error("\nPlease check your .env file.\n");
  }

  if (result.warnings.length > 0) {
    console.warn("\n⚠️  Environment warnings:");
    result.warnings.forEach((warning) => console.warn(`   - ${warning}`));
    console.warn("");
  }

  if (result.success && result.warnings.length === 0) {
    console.log("✅ Environment validation passed\n");
  }
}

export const config = {
  googleClientId: process.env.GOOGLE_CLIENT_ID || "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
  googleRefreshToken: process.env.GOOGLE_REFRESH_TOKEN || "",
  rootFolderId: process.env.NEXT_PUBLIC_ROOT_FOLDER_ID || "",
  rootFolderName: process.env.NEXT_PUBLIC_ROOT_FOLDER_NAME || "Home",

  nextAuthSecret: process.env.NEXTAUTH_SECRET || "",
  nextAuthUrl: process.env.NEXTAUTH_URL || "http://localhost:3000",
  shareSecretKey: process.env.SHARE_SECRET_KEY || "",
  adminEmails: (process.env.ADMIN_EMAILS || "").split(",").filter(Boolean),
  adminPassword: process.env.ADMIN_PASSWORD || "",

  kvUrl: process.env.KV_REST_API_URL || "",
  kvToken: process.env.KV_REST_API_TOKEN || "",

  storageLimitGb: process.env.STORAGE_LIMIT_GB
    ? parseInt(process.env.STORAGE_LIMIT_GB, 10)
    : null,
  storageWarningThreshold: process.env.STORAGE_WARNING_THRESHOLD
    ? parseFloat(process.env.STORAGE_WARNING_THRESHOLD)
    : 0.9,

  isEmailEnabled: !!(
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS
  ),
  isWebhookEnabled: !!process.env.WEBHOOK_URL,
  isSentryEnabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
  isDatabaseEnabled: !!(
    process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN
  ),
};

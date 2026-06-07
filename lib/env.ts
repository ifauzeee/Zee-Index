import { z } from "zod";

const envSchema = z.object({
  GOOGLE_CLIENT_ID: z.string().optional().or(z.literal("")),
  GOOGLE_CLIENT_SECRET: z.string().optional().or(z.literal("")),
  NEXT_PUBLIC_ROOT_FOLDER_ID: z.string().optional().or(z.literal("")),
  NEXT_PUBLIC_ROOT_FOLDER_NAME: z.string().default("Home"),

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

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  REDIS_URL: z.string().optional().or(z.literal("")),

  GOOGLE_REFRESH_TOKEN: z.string().optional().or(z.literal("")),
  PRIVATE_FOLDER_IDS: z.string().optional(),
  STORAGE_LIMIT_GB: z.string().optional(),
  STORAGE_WARNING_THRESHOLD: z.string().optional(),
  CRON_SECRET: z
    .string()
    .min(16, "CRON_SECRET must be at least 16 characters")
    .optional()
    .or(z.literal("")),

  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().optional(),

  STORAGE_PROVIDER: z.string().optional().default("google-drive"),
  TMDB_API_KEY: z.string().optional(),
  ANALYZE: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

export function validateOnStartup(): Env {
  if (
    process.env.NODE_ENV === "test" ||
    process.env.SKIP_ENV_VALIDATION === "1" ||
    process.env.SKIP_ENV_VALIDATION === "true" ||
    process.env.NEXT_PHASE === "phase-production-build"
  ) {
    // Provide fallback defaults to satisfy zod schemas during build time
    return {
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || "",
      GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || "",
      NEXT_PUBLIC_ROOT_FOLDER_ID: process.env.NEXT_PUBLIC_ROOT_FOLDER_ID || "",
      NEXT_PUBLIC_ROOT_FOLDER_NAME:
        process.env.NEXT_PUBLIC_ROOT_FOLDER_NAME || "Home",
      NEXTAUTH_SECRET:
        process.env.NEXTAUTH_SECRET || "12345678901234567890123456789012",
      NEXTAUTH_URL: process.env.NEXTAUTH_URL || "http://localhost:3000",
      SHARE_SECRET_KEY:
        process.env.SHARE_SECRET_KEY || "12345678901234567890123456789012",
      ADMIN_EMAILS: process.env.ADMIN_EMAILS || "admin@example.com",
      ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || "password",

      DATABASE_URL: process.env.DATABASE_URL || "postgresql://",
      REDIS_URL: process.env.REDIS_URL || "",
      GOOGLE_REFRESH_TOKEN: process.env.GOOGLE_REFRESH_TOKEN || "",
      SMTP_HOST: process.env.SMTP_HOST || "",
      SMTP_PORT: process.env.SMTP_PORT || "",
      SMTP_USER: process.env.SMTP_USER || "",
      SMTP_PASS: process.env.SMTP_PASS || "",
      EMAIL_FROM: process.env.EMAIL_FROM || "",
      STORAGE_PROVIDER: process.env.STORAGE_PROVIDER || "google-drive",
      TMDB_API_KEY: process.env.TMDB_API_KEY || "",
      ANALYZE: process.env.ANALYZE || "",
    } as Env;
  }

  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error(
      "\n❌ PROYEK GAGAL MENYALA: Environment Variable Tidak Valid",
    );
    console.error("=========================================================");
    result.error.issues.forEach((issue) => {
      console.error(`🚩 [${issue.path.join(".")}] -> ${issue.message}`);
    });
    console.error("=========================================================");
    console.error("Silakan periksa kembali file .env Anda.\n");

    if (process.env.NODE_ENV === "production") {
      process.exit(1);
    }
    return process.env as unknown as Env;
  }

  const warnings: string[] = [];
  if (!process.env.REDIS_URL)
    warnings.push(
      "REDIS_URL tidak diset. Data sementara tidak akan tersimpan secara persisten.",
    );
  if (!process.env.SMTP_HOST)
    warnings.push(
      "Konfigurasi Email (SMTP) tidak ditemukan. Fitur email akan dinonaktifkan.",
    );

  if (process.env.NODE_ENV === "production" && !process.env.CRON_SECRET)
    warnings.push(
      "CRON_SECRET belum diset. Endpoint cron akan menolak semua request.",
    );

  if (warnings.length > 0) {
    console.warn("\n⚠️  Peringatan Konfigurasi:");
    warnings.forEach((w) => console.warn(`   - ${w}`));
    console.warn("");
  } else {
    console.log("✅ Validasi Environment Berhasil\n");
  }

  return result.data;
}

export const env = validateOnStartup();

export const config = {
  googleClientId: env.GOOGLE_CLIENT_ID,
  googleClientSecret: env.GOOGLE_CLIENT_SECRET,
  googleRefreshToken: env.GOOGLE_REFRESH_TOKEN,
  rootFolderId: env.NEXT_PUBLIC_ROOT_FOLDER_ID,
  rootFolderName: env.NEXT_PUBLIC_ROOT_FOLDER_NAME,

  nextAuthSecret: env.NEXTAUTH_SECRET,
  nextAuthUrl: env.NEXTAUTH_URL,
  shareSecretKey: env.SHARE_SECRET_KEY,
  adminEmails: (env.ADMIN_EMAILS || "").split(",").filter(Boolean),
  adminPassword: env.ADMIN_PASSWORD,

  redisUrl: env.REDIS_URL,
  databaseUrl: env.DATABASE_URL,

  storageLimitGb: env.STORAGE_LIMIT_GB
    ? parseInt(env.STORAGE_LIMIT_GB, 10)
    : null,
  storageWarningThreshold: env.STORAGE_WARNING_THRESHOLD
    ? parseFloat(env.STORAGE_WARNING_THRESHOLD)
    : 0.9,

  isEmailEnabled: !!(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS),
  isDatabaseEnabled: !!env.DATABASE_URL,
  tmdbApiKey: env.TMDB_API_KEY,
  storageProvider: env.STORAGE_PROVIDER,
};

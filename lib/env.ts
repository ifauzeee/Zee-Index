import { z } from "zod";

const envSchema = z.object({
  GOOGLE_CLIENT_ID: z.string().min(1, "GOOGLE_CLIENT_ID is missing"),
  GOOGLE_CLIENT_SECRET: z.string().min(1, "GOOGLE_CLIENT_SECRET is missing"),

  NEXTAUTH_SECRET: z.string().min(1, "NEXTAUTH_SECRET is missing"),
  NEXTAUTH_URL: z.string().url().optional().default("http://localhost:3000"),

  KV_REST_API_URL: z.string().url().min(1, "KV_REST_API_URL is missing"),
  KV_REST_API_TOKEN: z.string().min(1, "KV_REST_API_TOKEN is missing"),

  GOOGLE_REFRESH_TOKEN: z.string().optional(),
  SHARE_SECRET_KEY: z.string().optional(),

  STORAGE_LIMIT_GB: z.string().optional(),
  STORAGE_WARNING_THRESHOLD: z.string().optional(),

  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().optional(),

  WEBHOOK_URL: z.string().url().optional(),
  CRON_SECRET: z.string().optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
});

export const env = envSchema.parse(process.env);

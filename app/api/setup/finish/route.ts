import { logger } from "@/lib/logger";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { createPublicRoute } from "@/lib/api-middleware";
import { invalidateAccessToken } from "@/lib/drive";
import { isAppConfigured } from "@/lib/config";
import { z } from "zod";

const setupFinishSchema = z.object({
  clientId: z.string().min(1),
  clientSecret: z.string().min(1),
  authCode: z.string().min(1),
  redirectUri: z.string().url(),
  rootFolderId: z.string().min(1),
});
const SETUP_ENV_KEYS = [
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "GOOGLE_REFRESH_TOKEN",
  "NEXT_PUBLIC_ROOT_FOLDER_ID",
] as const;

export function isAllowedSetupRequestOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) {
    return false;
  }

  try {
    const originUrl = new URL(origin);
    const requestUrl = new URL(request.url);

    return originUrl.origin === requestUrl.origin;
  } catch {
    return false;
  }
}

export function escapeEnvValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\r/g, "").replace(/\n/g, "");
}

export function hasPersistedSetupConfig(envContent: string): boolean {
  return SETUP_ENV_KEYS.every((key) => {
    const match = envContent.match(new RegExp(`^${key}=(.*)$`, "m"));
    if (!match) return false;

    const value = match[1].trim().replace(/^["']|["']$/g, "");
    return value.length > 0;
  });
}

export const POST = createPublicRoute(
  async ({ body, request }) => {
    try {
      if (!isAllowedSetupRequestOrigin(request)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const envPath = path.join(process.cwd(), ".env");
      let envContent = "";

      try {
        if (fs.existsSync(envPath)) {
          envContent = fs.readFileSync(envPath, "utf-8");
        }
      } catch (e) {
        logger.error({ err: e }, "Gagal membaca .env");
      }

      const isConfigured = await isAppConfigured();
      if (isConfigured || hasPersistedSetupConfig(envContent)) {
        return NextResponse.json(
          {
            error:
              "Setup has already been completed. Reset database to re-configure.",
          },
          { status: 403 },
        );
      }

      const { clientId, clientSecret, authCode, redirectUri, rootFolderId } =
        body;

      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code: authCode,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      });

      const tokenData = await tokenResponse.json();

      if (!tokenResponse.ok) {
        return NextResponse.json(
          { error: tokenData.error_description || "Gagal menukar token" },
          { status: 400 },
        );
      }

      if (!tokenData.refresh_token) {
        return NextResponse.json(
          {
            error:
              "Refresh Token tidak diterima. Pastikan akses di-revoke dulu atau gunakan prompt=consent.",
          },
          { status: 400 },
        );
      }

      const updateEnv = (key: string, value: string) => {
        const regex = new RegExp(`^${key}=.*$`, "m");
        const safeValue = escapeEnvValue(value);
        if (regex.test(envContent)) {
          envContent = envContent.replace(regex, `${key}="${safeValue}"`);
        } else {
          envContent += `\n${key}="${safeValue}"`;
        }
      };

      updateEnv("GOOGLE_CLIENT_ID", clientId);
      updateEnv("GOOGLE_CLIENT_SECRET", clientSecret);
      updateEnv("GOOGLE_REFRESH_TOKEN", tokenData.refresh_token);
      updateEnv("NEXT_PUBLIC_ROOT_FOLDER_ID", rootFolderId);

      let writeSuccess = false;
      try {
        fs.writeFileSync(envPath, envContent.trim() + "\n");
        writeSuccess = true;
      } catch (e: unknown) {
        logger.error(
          { err: e },
          "Gagal menulis ke .env, fallback ke konfigurasi manual",
        );
      }

      const manualConfigData = writeSuccess
        ? null
        : {
            GOOGLE_CLIENT_ID: clientId,
            GOOGLE_CLIENT_SECRET: clientSecret,
            GOOGLE_REFRESH_TOKEN: tokenData.refresh_token,
            NEXT_PUBLIC_ROOT_FOLDER_ID: rootFolderId,
          };

      try {
        await invalidateAccessToken();
      } catch {}

      return NextResponse.json({
        success: true,
        restartNeeded: writeSuccess,
        manualConfigNeeded: !writeSuccess,
        manualConfigData,
        message: writeSuccess
          ? "Konfigurasi berhasil diperbarui di file .env. PENTING: Anda HARUS me-restart container/aplikasi agar perubahan ini terbaca."
          : "Gagal menulis ke .env secara otomatis. Silakan salin nilai ini secara manual.",
      });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Internal Server Error";
      return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
  },
  { rateLimit: false, bodySchema: setupFinishSchema },
);

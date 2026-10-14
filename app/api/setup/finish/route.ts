import { logger } from "@/lib/logger";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import fs from "fs";
import { createPublicRoute } from "@/lib/api-middleware";
import { invalidateAccessToken } from "@/lib/drive";
import { z } from "zod";
import {
  envFilePath,
  hasPersistedSetupConfig,
  isAllowedSetupRequestOrigin,
  readEnvFile,
  setupAccessError,
  takePendingSetup,
} from "@/lib/setup-session";

export { hasPersistedSetupConfig, isAllowedSetupRequestOrigin };

// Client ID, secret and root folder may be left out when they are already
// set in the environment; the wizard then never handles the secret.
const setupFinishSchema = z.object({
  clientId: z.string().trim().optional(),
  clientSecret: z.string().trim().optional(),
  authCode: z.string().min(1),
  redirectUri: z.string().url(),
  rootFolderId: z.string().trim().optional(),
  setupToken: z.string().optional(),
  // OAuth state from /api/setup/prepare: the wizard values were stored on
  // the server under it instead of in the browser.
  state: z.string().optional(),
});

/** A value from the request, or the environment when the request has none. */
function fromBodyOrEnv(
  value: string | undefined,
  envKey:
    "GOOGLE_CLIENT_ID" | "GOOGLE_CLIENT_SECRET" | "NEXT_PUBLIC_ROOT_FOLDER_ID",
): string {
  return value || process.env[envKey]?.trim() || "";
}
export function escapeEnvValue(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\r/g, "")
    .replace(/\n/g, "");
}

/** Rewrite or append one `KEY="value"` line in an .env document. */
export function writeEnvValue(
  envContent: string,
  key: string,
  value: string,
): string {
  const safeValue = escapeEnvValue(value);
  // A replacer function is required: a string replacement would let `$&` and
  // friends in the value expand to parts of the match.
  const line = () => `${key}="${safeValue}"`;
  const regex = new RegExp(`^${key}=.*$`, "m");

  return regex.test(envContent)
    ? envContent.replace(regex, line)
    : `${envContent}\n${line()}`;
}

export const POST = createPublicRoute(
  async ({ body, request, session }) => {
    try {
      if (!isAllowedSetupRequestOrigin(request)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const envPath = envFilePath();
      let envContent = readEnvFile();

      let pending = null;
      if (body.state) {
        pending = await takePendingSetup(body.state);
        if (!pending) {
          return NextResponse.json(
            {
              error:
                'This setup session has expired. Click "Authorize with Google" again.',
            },
            { status: 400 },
          );
        }
      }

      const denied = await setupAccessError(
        envContent,
        session,
        body.setupToken ?? pending?.setupToken,
      );
      if (denied) {
        return NextResponse.json(
          { error: denied.error },
          { status: denied.status },
        );
      }

      const { authCode, redirectUri } = body;
      const clientId = fromBodyOrEnv(
        body.clientId || pending?.clientId,
        "GOOGLE_CLIENT_ID",
      );
      const clientSecret = fromBodyOrEnv(
        body.clientSecret || pending?.clientSecret,
        "GOOGLE_CLIENT_SECRET",
      );
      const rootFolderId = fromBodyOrEnv(
        body.rootFolderId || pending?.rootFolderId,
        "NEXT_PUBLIC_ROOT_FOLDER_ID",
      );
      if (!clientId || !clientSecret || !rootFolderId) {
        return NextResponse.json(
          {
            error:
              "Client ID, client secret and root folder ID are required (in the form or in .env).",
          },
          { status: 400 },
        );
      }

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
        envContent = writeEnvValue(envContent, key, value);
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

      const manualConfigData =
        writeSuccess || session?.user?.role !== "ADMIN"
          ? null
          : {
              GOOGLE_CLIENT_ID: clientId,
              GOOGLE_CLIENT_SECRET: clientSecret,
              GOOGLE_REFRESH_TOKEN: tokenData.refresh_token,
              NEXT_PUBLIC_ROOT_FOLDER_ID: rootFolderId,
            };

      try {
        await invalidateAccessToken();
      } catch (error) {
        logger.error(
          { err: error },
          "[Setup] Failed to invalidate access token",
        );
      }

      return NextResponse.json({
        success: true,
        restartNeeded: writeSuccess,
        manualConfigNeeded: !writeSuccess,
        manualConfigData,
        message: writeSuccess
          ? "Konfigurasi berhasil diperbarui di file .env. PENTING: Anda HARUS me-restart container/aplikasi agar perubahan ini terbaca."
          : "Gagal menulis ke .env secara otomatis. Silakan salin nilai ini secara manual.",
      });
    } catch {
      return NextResponse.json(
        { error: "Terjadi kesalahan internal." },
        { status: 500 },
      );
    }
  },
  { rateLimit: false, bodySchema: setupFinishSchema, includeSession: true },
);

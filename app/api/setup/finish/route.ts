export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { kv } from "@/lib/kv";
import fs from "fs";
import path from "path";
import { invalidateAccessToken } from "@/lib/drive";
import { isAppConfigured } from "@/lib/config";

export async function POST(req: Request) {
  try {
    const isConfigured = await isAppConfigured();
    if (isConfigured) {
      return NextResponse.json(
        {
          error:
            "Setup has already been completed. Reset database to re-configure.",
        },
        { status: 403 },
      );
    }

    const { clientId, clientSecret, authCode, redirectUri, rootFolderId } =
      await req.json();

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

    let envPath = path.join(process.cwd(), ".env");
    let envContent = "";
    let canWriteEnv = true;

    try {
      if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, "utf-8");
      }
    } catch (e) {
      console.error("Gagal membaca .env:", e);
    }

    const updateEnv = (key: string, value: string) => {
      const regex = new RegExp(`^${key}=.*$`, "m");
      if (regex.test(envContent)) {
        envContent = envContent.replace(regex, `${key}="${value}"`);
      } else {
        envContent += `\n${key}="${value}"`;
      }
    };

    updateEnv("GOOGLE_CLIENT_ID", clientId);
    updateEnv("GOOGLE_CLIENT_SECRET", clientSecret);
    updateEnv("GOOGLE_REFRESH_TOKEN", tokenData.refresh_token);
    updateEnv("NEXT_PUBLIC_ROOT_FOLDER_ID", rootFolderId);

    try {
      fs.writeFileSync(envPath, envContent.trim() + "\n");
    } catch (e: any) {
      console.error("Gagal menulis ke .env:", e);
      if (e.code === "EACCES" || e.code === "EPERM") {
        return NextResponse.json(
          {
            error:
              "Izin ditolak (EACCES) saat menulis ke file .env. " +
              "Jika Anda menggunakan Docker, pastikan file .env di-mount sebagai volume atau atur izin file secara manual. " +
              "Anda juga bisa memasukkan nilai ini secara manual ke .env: " +
              `GOOGLE_CLIENT_ID="${clientId}", GOOGLE_CLIENT_SECRET="${clientSecret}", GOOGLE_REFRESH_TOKEN="${tokenData.refresh_token}", NEXT_PUBLIC_ROOT_FOLDER_ID="${rootFolderId}"`,
          },
          { status: 500 },
        );
      }
      throw e;
    }

    try {
      await invalidateAccessToken();
    } catch (e) {}

    return NextResponse.json({
      success: true,
      restartNeeded: true,
      message:
        "Konfigurasi berhasil diperbarui di file .env. " +
        "PENTING: Anda HARUS me-restart container/aplikasi agar perubahan ini terbaca.",
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

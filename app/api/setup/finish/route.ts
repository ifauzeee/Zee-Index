import { NextResponse } from "next/server";
import { kv } from "@/lib/kv";
import fs from "fs";
import path from "path";
import { invalidateAccessToken } from "@/lib/googleDrive";
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

    await kv.set("zee-index:credentials", {
      clientId,
      clientSecret,
      refreshToken: tokenData.refresh_token,
      rootFolderId,
    });

    await invalidateAccessToken();

    const isDev = process.env.NODE_ENV === "development";
    let restartNeeded = false;

    if (isDev) {
      try {
        const envPath = path.join(process.cwd(), ".env");
        let envContent = "";

        if (fs.existsSync(envPath)) {
          envContent = fs.readFileSync(envPath, "utf8");
        }

        const updates = {
          GOOGLE_CLIENT_ID: clientId,
          GOOGLE_CLIENT_SECRET: clientSecret,
          NEXT_PUBLIC_ROOT_FOLDER_ID: rootFolderId,
          GOOGLE_REFRESH_TOKEN: tokenData.refresh_token,
        };

        Object.entries(updates).forEach(([key, value]) => {
          const regex = new RegExp(`^${key}=.*`, "m");
          if (regex.test(envContent)) {
            envContent = envContent.replace(regex, `${key}=${value}`);
          } else {
            envContent += `\n${key}=${value}`;
          }
        });

        fs.writeFileSync(envPath, envContent.trim() + "\n");
        restartNeeded = true;
      } catch (err) {
        console.error(err);
      }
    }

    return NextResponse.json({
      success: true,
      restartNeeded,
      message: "Token berhasil disimpan.",
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

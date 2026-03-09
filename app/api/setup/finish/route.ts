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

    await kv.set("zee-index:credentials", {
      clientId,
      clientSecret,
      refreshToken: tokenData.refresh_token,
      rootFolderId,
    });

    await invalidateAccessToken();

    return NextResponse.json({
      success: true,
      restartNeeded: false,
      message: "Token berhasil disimpan di database.",
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

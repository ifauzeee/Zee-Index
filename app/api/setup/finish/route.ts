import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";

export async function POST(req: Request) {
  const { clientId, clientSecret, authCode, redirectUri, rootFolderId } = await req.json();

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

  if (!tokenData.refresh_token) {
    return NextResponse.json({ error: "Gagal mendapatkan Refresh Token. Pastikan App masih dalam mode Testing di Google Cloud atau user sudah dimasukkan." }, { status: 400 });
  }

  await kv.set("zee-index:credentials", {
    clientId,
    clientSecret,
    refreshToken: tokenData.refresh_token,
    rootFolderId
  });

  return NextResponse.json({ success: true });
}

export const dynamic = "force-dynamic";

import { NextResponse, NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { authenticator } from "otplib";
import { kv } from "@/lib/kv";
import { checkRateLimit } from "@/lib/ratelimit";

export async function POST(request: NextRequest) {
  const { success } = await checkRateLimit(request, "AUTH");
  if (!success) {
    return NextResponse.json(
      { error: "Terlalu banyak percobaan. Silakan coba lagi nanti." },
      { status: 429 },
    );
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Akses ditolak." }, { status: 401 });
  }

  try {
    const { token } = await request.json();
    const userEmail = session.user.email;

    const secret: string | null = await kv.get(`2fa:secret:temp:${userEmail}`);
    if (!secret) {
      return NextResponse.json(
        { error: "Sesi pembuatan 2FA telah kedaluwarsa." },
        { status: 400 },
      );
    }

    const isValid = authenticator.check(token, secret);
    if (!isValid) {
      return NextResponse.json(
        { error: "Kode verifikasi tidak valid." },
        { status: 400 },
      );
    }

    await kv.set(`2fa:secret:${userEmail}`, secret);
    await kv.set(`2fa:enabled:${userEmail}`, true);
    await kv.del(`2fa:secret:temp:${userEmail}`);

    return NextResponse.json({
      success: true,
      message: "2FA berhasil diaktifkan.",
    });
  } catch (error) {
    console.error("2FA Verify Error:", error);
    return NextResponse.json(
      { error: "Gagal memverifikasi kode 2FA." },
      { status: 500 },
    );
  }
}

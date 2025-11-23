import { NextResponse, NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { kv } from "@vercel/kv";
import { checkRateLimit } from "@/lib/ratelimit";

export async function POST(request: NextRequest) {
  const { success } = await checkRateLimit(request);
  if (!success) {
    return NextResponse.json(
      { error: "Terlalu banyak permintaan. Silakan coba lagi nanti." },
      { status: 429 },
    );
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Akses ditolak." }, { status: 401 });
  }

  try {
    const userEmail = session.user.email;

    await kv.del(`2fa:secret:${userEmail}`);
    await kv.del(`2fa:enabled:${userEmail}`);

    return NextResponse.json({
      success: true,
      message: "2FA berhasil dinonaktifkan.",
    });
  } catch (error) {
    console.error("2FA Disable Error:", error);
    return NextResponse.json(
      { error: "Gagal menonaktifkan 2FA." },
      { status: 500 },
    );
  }
}

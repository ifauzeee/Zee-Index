import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { kv } from "@/lib/kv";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Akses ditolak." }, { status: 401 });
  }

  try {
    const userEmail = session.user.email;
    const isEnabled = await kv.get(`2fa:enabled:${userEmail}`);

    return NextResponse.json({ isEnabled: !!isEnabled });
  } catch (error) {
    console.error("2FA Status Check Error:", error);
    return NextResponse.json(
      { error: "Gagal memeriksa status 2FA." },
      { status: 500 },
    );
  }
}

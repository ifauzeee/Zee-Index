import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { authenticator } from "otplib";
import qrcode from "qrcode";
import { kv } from "@vercel/kv";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Akses ditolak." }, { status: 401 });
  }

  try {
    const userEmail = session.user.email;
    const secret = authenticator.generateSecret();
    const appName = "Zee-Index";

    await kv.set(`2fa:secret:temp:${userEmail}`, secret, { ex: 300 });

    const otpauth = authenticator.keyuri(userEmail, appName, secret);
    const qrCodeDataURL = await qrcode.toDataURL(otpauth);

    return NextResponse.json({ secret, qrCodeDataURL });
  } catch (error) {
    console.error("2FA Generate Error:", error);
    return NextResponse.json(
      { error: "Gagal membuat kode 2FA." },
      { status: 500 },
    );
  }
}

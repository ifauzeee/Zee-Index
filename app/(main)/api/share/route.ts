import { NextRequest, NextResponse } from "next/server";
import { SignJWT, decodeJwt } from "jose";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import crypto from "crypto";
import { kv } from "@/lib/kv";
import type { ShareLink } from "@/lib/store";
import { sendMail } from "@/lib/mailer";

interface ShareRequestBody {
  path: string;
  itemName: string;
  type: "timed" | "session";
  expiresIn: string;
  loginRequired?: boolean;
}

const SHARE_LINKS_KEY = "zee-index:share-links";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "ADMIN" || !session.user.email) {
      return NextResponse.json(
        { error: "Akses ditolak. Izin admin dan email pengguna diperlukan." },
        { status: 403 },
      );
    }

    const { path, itemName, type, expiresIn, loginRequired }: ShareRequestBody =
      await req.json();

    if (!path || !type || !expiresIn || !itemName) {
      return NextResponse.json(
        { error: "Path, itemName, type, dan expiresIn diperlukan." },
        { status: 400 },
      );
    }

    const secret = new TextEncoder().encode(process.env.SHARE_SECRET_KEY!);
    const jti = crypto.randomUUID();

    const token = await new SignJWT({
      path,
      loginRequired: loginRequired ?? false,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime(expiresIn)
      .setJti(jti)
      .sign(secret);

    const shareableUrl = `${req.nextUrl.origin}${path}?share_token=${token}`;

    const decodedToken = decodeJwt(token);
    if (!decodedToken.exp) {
      throw new Error("Token tidak memiliki waktu kedaluwarsa.");
    }

    const newShareLink: ShareLink = {
      id: jti,
      path,
      token,
      jti,
      expiresAt: new Date(decodedToken.exp * 1000).toISOString(),
      loginRequired: loginRequired ?? false,
      itemName,
    };

    const existingLinks: ShareLink[] = (await kv.get(SHARE_LINKS_KEY)) || [];
    const updatedLinks = [...existingLinks, newShareLink];
    await kv.set(SHARE_LINKS_KEY, updatedLinks);

    const adminEmails =
      process.env.ADMIN_EMAILS?.split(",")
        .map((email: string) => email.trim())
        .filter(Boolean) || [];
    if (adminEmails.length > 0) {
      await sendMail({
        to: adminEmails,
        subject: `[Zee Index] Tautan Berbagi Baru Dibuat`,
        html: `
                <p>Halo Admin,</p>
                <p>Tautan berbagi baru telah dibuat oleh <b>${session.user.email}</b>.</p>
                <ul>
                    <li><b>Item:</b> ${itemName}</li>
                    <li><b>Path:</b> ${path}</li>
                    <li><b>Kedaluwarsa pada:</b> ${new Date(newShareLink.expiresAt).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })}</li>
                    <li><b>Wajib Login:</b> ${loginRequired ? "Ya" : "Tidak"}</li>
                </ul>
                <p>Anda dapat mengelola semua tautan di dasbor admin.</p>
            `,
      });
    }

    return NextResponse.json({ shareableUrl, token, jti, newShareLink });
  } catch (error) {
    console.error("Error generating share link:", error);
    return NextResponse.json(
      { error: "Gagal membuat tautan berbagi." },
      { status: 500 },
    );
  }
}
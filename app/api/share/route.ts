import { NextRequest, NextResponse } from "next/server";
import { SignJWT, decodeJwt } from "jose";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import crypto from "crypto";
import { kv } from "@/lib/kv";
import type { ShareLink } from "@/lib/store";
import { sendMail } from "@/lib/mailer";
import type { DriveFile } from "@/lib/drive";

interface ShareRequestBody {
  path?: string;
  itemName: string;
  type: "timed" | "session";
  expiresIn: string;
  loginRequired?: boolean;
  items?: DriveFile[];
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

    const {
      path,
      itemName,
      type,
      expiresIn,
      loginRequired,
      items,
    }: ShareRequestBody = await req.json();
    const isCollection = items && items.length > 0;

    if ((!isCollection && !path) || !itemName || !type || !expiresIn) {
      return NextResponse.json(
        { error: "Parameter yang diperlukan tidak lengkap." },
        { status: 400 },
      );
    }

    const validExpireFormats = /^\d+[smhdw]$/;
    if (!validExpireFormats.test(expiresIn)) {
      return NextResponse.json(
        {
          error:
            "Format expiresIn tidak valid. Gunakan format seperti: 1h, 7d, 30d",
        },
        { status: 400 },
      );
    }

    const secret = new TextEncoder().encode(process.env.SHARE_SECRET_KEY!);
    const jti = crypto.randomUUID();

    const sharePath = isCollection ? `/share/${jti}` : path!;
    const shareName = itemName;

    const token = await new SignJWT({
      shareId: jti,
      loginRequired: loginRequired ?? false,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime(expiresIn)
      .setJti(jti)
      .sign(secret);
    const shareableUrl = `${req.nextUrl.origin}${sharePath}?share_token=${token}`;

    const decodedToken = decodeJwt(token);
    if (!decodedToken.exp) {
      throw new Error("Token tidak memiliki waktu kedaluwarsa.");
    }

    if (isCollection) {
      const expiresInSeconds = (decodedToken.exp * 1000 - Date.now()) / 1000;
      await kv.set(`zee-index:share-items:${jti}`, items, {
        ex: Math.ceil(expiresInSeconds) + 3600,
      });
    }

    const newShareLink: ShareLink = {
      id: jti,
      path: sharePath,
      token,
      jti,
      expiresAt: new Date(decodedToken.exp * 1000).toISOString(),
      loginRequired: loginRequired ?? false,
      itemName: shareName,
      isCollection: isCollection,
    };

    await kv.hset(SHARE_LINKS_KEY, { [newShareLink.jti]: newShareLink });

    const adminEmails =
      process.env.ADMIN_EMAILS?.split(",")
        .map((email: string) => email.trim())
        .filter(Boolean) || [];
    if (adminEmails.length > 0) {
      await sendMail({
        to: adminEmails,
        subject: `[Zee Index] Tautan ${
          isCollection ? "Koleksi" : "Berbagi"
        } Baru Dibuat`,
        html: `
    
        <p>Halo Admin,</p>
                <p>Tautan ${
          isCollection ? "koleksi" : "berbagi"
        } baru telah dibuat oleh <b>${session.user.email}</b>.</p>
                <ul>
                    <li><b>Item:</b> ${shareName}</li>
                    <li><b>Path:</b> ${sharePath}</li>
                    <li><b>Kedaluwarsa pada:</b> ${new Date(
          newShareLink.expiresAt,
        ).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })}</li>
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

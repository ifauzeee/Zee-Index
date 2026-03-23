export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createAdminRoute } from "@/lib/api-middleware";
import { SignJWT, decodeJwt } from "jose";
import crypto from "crypto";
import { kv } from "@/lib/kv";
import { db } from "@/lib/db";
import type { ShareLink } from "@/lib/store";
import { sendMail } from "@/lib/mailer";
import { getBaseUrl } from "@/lib/utils";
import {
  shareCreateRequestSchema,
  type ShareCreateRequest,
} from "@/lib/link-payloads";
import { REDIS_KEYS } from "@/lib/constants";

export const POST = createAdminRoute(
  async ({ request, session }) => {
    try {
      const parsedBody = shareCreateRequestSchema.safeParse(
        await request.json(),
      );
      if (!parsedBody.success) {
        return NextResponse.json(
          { error: "Parameter yang diperlukan tidak lengkap." },
          { status: 400 },
        );
      }

      const {
        path,
        itemName,
        expiresIn,
        loginRequired,
        items,
        maxUses,
        preventDownload,
        hasWatermark,
        watermarkText,
      }: ShareCreateRequest = parsedBody.data;
      const isCollection = items && items.length > 0;

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
        preventDownload: preventDownload ?? false,
        hasWatermark: hasWatermark ?? false,
        watermarkText: watermarkText || null,
      })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime(expiresIn)
        .setJti(jti)
        .sign(secret);
      const shareableUrl = `${getBaseUrl()}${sharePath}?share_token=${token}`;

      const decodedToken = decodeJwt(token);
      if (!decodedToken.exp) {
        throw new Error("Token tidak memiliki waktu kedaluwarsa.");
      }

      if (isCollection) {
        const expiresInSeconds = (decodedToken.exp * 1000 - Date.now()) / 1000;
        await kv.set(`${REDIS_KEYS.SHARE_ITEMS}${jti}`, items, {
          ex: Math.ceil(expiresInSeconds) + 3600,
        });
      }

      const expiresAtDate = new Date(decodedToken.exp * 1000);

      const shareLinkRecord = await db.shareLink.create({
        data: {
          id: jti,
          path: sharePath,
          token,
          jti,
          expiresAt: expiresAtDate,
          loginRequired: loginRequired ?? false,
          itemName: shareName,
          isCollection: isCollection,
          maxUses: maxUses ?? null,
          preventDownload: preventDownload ?? false,
          hasWatermark: hasWatermark ?? false,
          watermarkText: watermarkText || null,
        },
      });

      const newShareLink: ShareLink = {
        id: shareLinkRecord.id,
        path: shareLinkRecord.path,
        token: shareLinkRecord.token,
        jti: shareLinkRecord.jti,
        expiresAt: shareLinkRecord.expiresAt.toISOString(),
        loginRequired: shareLinkRecord.loginRequired,
        itemName: shareLinkRecord.itemName,
        isCollection: shareLinkRecord.isCollection,
        maxUses: shareLinkRecord.maxUses,
        preventDownload: shareLinkRecord.preventDownload,
        hasWatermark: shareLinkRecord.hasWatermark,
        watermarkText: shareLinkRecord.watermarkText,
      };

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
                    <li><b>Kedaluwarsa pada:</b> ${expiresAtDate.toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })}</li>
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
  },
  { requireEmail: true },
);

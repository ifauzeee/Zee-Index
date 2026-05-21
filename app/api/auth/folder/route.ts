import { logger } from "@/lib/logger";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import crypto from "crypto";
import { SignJWT } from "jose";
import { createPublicRoute } from "@/lib/api-middleware";
import { getProtectedFolderCredentials } from "@/lib/auth";
import { checkRateLimit } from "@/lib/ratelimit";
import bcrypt from "bcryptjs";
import { z } from "zod";

const folderAuthSchema = z.object({
  folderId: z.string().min(1),
  id: z.string().min(1),
  password: z.string().min(1),
});

export const POST = createPublicRoute(
  async ({ request, body }) => {
    const { success } = await checkRateLimit(request, "AUTH");
    if (!success) {
      return NextResponse.json(
        { error: "Terlalu banyak percobaan. Silakan coba lagi nanti." },
        { status: 429 },
      );
    }

    try {
      const { folderId, id, password } = body;

      const folderConfig = await getProtectedFolderCredentials(folderId);
      if (!folderConfig) {
        return NextResponse.json(
          {
            error:
              "Folder ini tidak dikonfigurasi untuk perlindungan atau tidak ditemukan.",
          },
          { status: 404 },
        );
      }

      const maxLength = Math.max(id.length, folderConfig.id.length);
      const paddedId = id.padEnd(maxLength, "\0");
      const paddedConfigId = folderConfig.id.padEnd(maxLength, "\0");
      const isIdValid = crypto.timingSafeEqual(
        Buffer.from(paddedId, "utf8"),
        Buffer.from(paddedConfigId, "utf8"),
      );
      const isPasswordValid = await bcrypt.compare(
        password,
        folderConfig.password,
      );
      if (isIdValid && isPasswordValid) {
        const secret = new TextEncoder().encode(process.env.SHARE_SECRET_KEY!);
        const token = await new SignJWT({ folderId: folderId })
          .setProtectedHeader({ alg: "HS256" })
          .setIssuedAt()
          .setExpirationTime("1h")
          .sign(secret);
        return NextResponse.json({ success: true, token }, { status: 200 });
      } else {
        return NextResponse.json(
          { error: "ID atau password salah." },
          { status: 401 },
        );
      }
    } catch (error) {
      logger.error({ err: error }, "Folder Auth API error");
      return NextResponse.json(
        { error: "Internal Server Error" },
        { status: 500 },
      );
    }
  },
  { rateLimit: false, bodySchema: folderAuthSchema },
);

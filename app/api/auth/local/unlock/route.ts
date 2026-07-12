import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAppConfig } from "@/lib/app-config";
import { SignJWT } from "jose";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { getLocalStorageAuthSecret } from "@/lib/local-auth-secret";
import { isHashedLocalStoragePassword } from "@/lib/app-config";
import { createPublicRoute, ApiRouteError } from "@/lib/api-middleware";

const unlockBodySchema = z.object({
  password: z.string().min(1, "Password is required"),
});

export const POST = createPublicRoute(
  async ({ body, request }) => {
    const secret = getLocalStorageAuthSecret();
    if (!secret) {
      logger.error(
        "[LocalAuth] NEXTAUTH_SECRET is invalid for local storage auth",
      );
      throw new ApiRouteError(
        503,
        "Server authentication secret is not configured.",
      );
    }

    const { password } = body;
    const config = await getAppConfig();

    const dbProtected = await db.protectedFolder.findUnique({
      where: { folderId: "local-storage:" },
    });

    let isPasswordCorrect = false;

    if (dbProtected && dbProtected.password) {
      isPasswordCorrect = await bcrypt.compare(password, dbProtected.password);
    } else if (config.localStorageAuthEnabled && config.localStoragePassword) {
      if (isHashedLocalStoragePassword(config.localStoragePassword)) {
        isPasswordCorrect = await bcrypt.compare(
          password,
          config.localStoragePassword,
        );
      } else {
        // Legacy plaintext config still accepted for unlock, but never preferred.
        logger.warn(
          "[LocalAuth] Using legacy plaintext local storage password; migrate to bcrypt hash",
        );
        isPasswordCorrect = password === config.localStoragePassword;
      }
    } else {
      return NextResponse.json({ success: true, message: "Not protected" });
    }

    if (isPasswordCorrect) {
      const token = await new SignJWT({ unlocked: true })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("24h")
        .sign(secret);

      const response = NextResponse.json({ success: true });
      const isLocal =
        request.nextUrl.hostname === "localhost" ||
        request.nextUrl.hostname === "127.0.0.1" ||
        request.nextUrl.hostname.startsWith("192.168.");
      const isSecure = process.env.NODE_ENV === "production" && !isLocal;
      response.cookies.set("local_storage_token", token, {
        httpOnly: true,
        secure: isSecure,
        sameSite: "lax",
        maxAge: 60 * 60 * 24,
        path: "/",
      });

      return response;
    }

    throw new ApiRouteError(401, "Invalid password");
  },
  {
    bodySchema: unlockBodySchema,
    rateLimit: "AUTH",
    includeSession: false,
  },
);

export const dynamic = "force-dynamic";

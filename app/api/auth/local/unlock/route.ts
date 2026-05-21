import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { getAppConfig } from "@/lib/app-config";
import { SignJWT } from "jose";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { getLocalStorageAuthSecret } from "@/lib/local-auth-secret";
import { isHashedLocalStoragePassword } from "@/lib/app-config";

export async function POST(req: NextRequest) {
  try {
    const secret = getLocalStorageAuthSecret();
    if (!secret) {
      logger.error(
        "[LocalAuth] NEXTAUTH_SECRET tidak valid untuk local storage auth",
      );
      return NextResponse.json(
        { error: "Server authentication secret is not configured." },
        { status: 503 },
      );
    }

    const { password } = await req.json();
    const config = await getAppConfig();

    const dbProtected = await db.protectedFolder.findUnique({
      where: { folderId: "local-storage:" },
    });

    let isPasswordCorrect = false;

    if (dbProtected && dbProtected.password) {
      isPasswordCorrect = await bcrypt.compare(password, dbProtected.password);
    } else if (config.localStorageAuthEnabled && config.localStoragePassword) {
      isPasswordCorrect = isHashedLocalStoragePassword(
        config.localStoragePassword,
      )
        ? await bcrypt.compare(password, config.localStoragePassword)
        : password === config.localStoragePassword;
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
        req.nextUrl.hostname === "localhost" ||
        req.nextUrl.hostname === "127.0.0.1" ||
        req.nextUrl.hostname.startsWith("192.168.");
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

    return NextResponse.json({ error: "Password salah" }, { status: 401 });
  } catch (error) {
    logger.error({ err: error }, "[LocalAuth] Unlock error");
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

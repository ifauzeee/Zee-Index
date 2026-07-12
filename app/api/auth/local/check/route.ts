import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { createPublicRoute } from "@/lib/api-middleware";
import { getLocalStorageAuthSecret } from "@/lib/local-auth-secret";

export const GET = createPublicRoute(
  async ({ request }) => {
    const cookie = request.cookies.get("local_storage_token");
    if (!cookie) return NextResponse.json({ authenticated: false });

    const secret = getLocalStorageAuthSecret();
    if (!secret) {
      return NextResponse.json({ authenticated: false });
    }

    try {
      await jwtVerify(cookie.value, secret);
      return NextResponse.json({ authenticated: true });
    } catch {
      return NextResponse.json({ authenticated: false });
    }
  },
  { rateLimit: "API", includeSession: false },
);

export const dynamic = "force-dynamic";

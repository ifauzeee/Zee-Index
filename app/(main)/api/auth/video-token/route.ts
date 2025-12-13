import { NextResponse, NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { SignJWT } from "jose";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { fileId } = await request.json();
    if (!fileId) {
      return NextResponse.json({ error: "File ID required" }, { status: 400 });
    }

    const secret = new TextEncoder().encode(process.env.SHARE_SECRET_KEY);
    const videoToken = await new SignJWT({ fileId, type: "video_access" })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("2h") // Token valid for 2 hours
      .sign(secret);

    return NextResponse.json({ token: videoToken });
  } catch (error) {
    console.error("Video token error:", error);
    return NextResponse.json(
      { error: "Failed to generate token" },
      { status: 500 },
    );
  }
}

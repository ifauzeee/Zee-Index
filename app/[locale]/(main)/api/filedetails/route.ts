import { NextResponse, NextRequest } from "next/server";
import { getFileDetailsFromDrive } from "@/lib/googleDrive";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { validateShareToken } from "@/lib/auth";
import { isAccessRestricted } from "@/lib/securityUtils";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const isShareAuth = await validateShareToken(request);

  if (!session && !isShareAuth) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  }

  const { searchParams } = new URL(request.url);
  const fileId = searchParams.get("fileId");
  if (!fileId) {
    return NextResponse.json(
      { error: "Parameter fileId tidak ditemukan." },
      { status: 400 },
    );
  }

  const isAdmin = session?.user?.role === "ADMIN";

  if (!isAdmin) {
    const isRestricted = await isAccessRestricted(fileId);
    if (isRestricted) {
      return NextResponse.json({ error: "Access Denied" }, { status: 403 });
    }
  }

  try {
    const details = await getFileDetailsFromDrive(fileId);
    return NextResponse.json(details);
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Terjadi kesalahan tidak dikenal.";
    console.error("File Details API Error:", errorMessage);
    return NextResponse.json(
      { error: "Gagal mengambil detail file.", details: errorMessage },
      { status: 500 },
    );
  }
}

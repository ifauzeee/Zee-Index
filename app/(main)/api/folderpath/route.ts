import { NextResponse, NextRequest } from "next/server";
import { getFolderPath } from "@/lib/googleDrive";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { validateShareToken } from "@/lib/auth";

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
  const folderId = searchParams.get("folderId");
  if (!folderId) {
    return NextResponse.json(
      { error: "Parameter folderId tidak ditemukan." },
      { status: 400 },
    );
  }

  if (folderId === process.env.NEXT_PUBLIC_ROOT_FOLDER_ID) {
    return NextResponse.json([]);
  }

  try {
    const path = await getFolderPath(folderId);
    return NextResponse.json(path);
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Terjadi kesalahan tidak dikenal.";
    console.error("Folder Path API Error:", errorMessage);
    return NextResponse.json(
      { error: "Gagal mengambil jalur folder.", details: errorMessage },
      { status: 500 },
    );
  }
}

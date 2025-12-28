export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { getStorageDetails } from "@/lib/drive";
import { isAccessRestricted } from "@/lib/securityUtils";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Akses ditolak." }, { status: 401 });
  }

  try {
    const details = await getStorageDetails();
    const isAdmin = session.user?.role === "ADMIN";

    if (!isAdmin) {
      const allowedFiles = [];
      for (const file of details.largestFiles) {
        const restricted = await isAccessRestricted(file.id);
        if (!restricted) {
          allowedFiles.push(file);
        }
      }
      details.largestFiles = allowedFiles;
    }

    return NextResponse.json(details);
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Terjadi kesalahan tidak dikenal.";
    console.error("Storage Details API Error:", errorMessage);
    return NextResponse.json(
      { error: "Gagal mengambil detail penyimpanan.", details: errorMessage },
      { status: 500 },
    );
  }
}

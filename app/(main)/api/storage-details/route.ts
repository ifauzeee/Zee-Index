import { NextResponse } from "next/server";
import { getStorageDetails } from "@/lib/googleDrive";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";

export const revalidate = 14400;

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Akses ditolak." }, { status: 401 });
  }

  try {
    const details = await getStorageDetails();
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

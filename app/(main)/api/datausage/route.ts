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
    const storageDetails = await getStorageDetails();
    return NextResponse.json({
      totalUsage: storageDetails.usage,
    });
  } catch (error: any) {
    console.error("Data Usage API Error:", error.message);
    return NextResponse.json(
      { error: "Failed to calculate data usage.", details: error.message },
      { status: 500 },
    );
  }
}
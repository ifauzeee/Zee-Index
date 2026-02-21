import { NextResponse } from "next/server";
import { getStorageDetails } from "@/lib/drive";

export const revalidate = 7200;
export const maxDuration = 60;

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const storageDetails = await getStorageDetails();
    return NextResponse.json({
      totalUsage: storageDetails.usage,
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Terjadi kesalahan tidak dikenal.";
    return NextResponse.json(
      { error: "Failed to calculate data usage.", details: errorMessage },
      { status: 500 },
    );
  }
}

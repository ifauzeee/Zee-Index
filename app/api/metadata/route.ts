import { NextRequest, NextResponse } from "next/server";
import { searchTMDB } from "@/lib/tmdb";
import { cleanMediaTitle } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const filename = searchParams.get("filename");

  if (!filename) {
    return NextResponse.json(
      { error: "Filename is required" },
      { status: 400 },
    );
  }

  try {
    const { title, year } = cleanMediaTitle(filename);
    const metadata = await searchTMDB(title, year);

    return NextResponse.json(metadata);
  } catch (error) {
    console.error("[API Metadata] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

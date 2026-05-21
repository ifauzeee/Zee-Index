import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";
import { createPublicRoute } from "@/lib/api-middleware";
import { searchTMDB } from "@/lib/tmdb";
import { cleanMediaTitle } from "@/lib/utils";

export const GET = createPublicRoute(
  async ({ request }) => {
    const { searchParams } = new URL(request.url);
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
      logger.error({ err: error }, "[API Metadata] Error");
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }
  },
  { rateLimit: false },
);

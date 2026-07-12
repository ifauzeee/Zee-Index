import { NextResponse } from "next/server";
import { createAdminRoute } from "@/lib/api-middleware";
import { reindexDrive } from "@/lib/search-index";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export const POST = createAdminRoute(async () => {
  try {
    const result = await reindexDrive();
    return NextResponse.json({ message: "Reindex complete", ...result });
  } catch (error) {
    logger.error({ err: error }, "Reindex request failed");
    return NextResponse.json({ error: "Failed to reindex" }, { status: 500 });
  }
});

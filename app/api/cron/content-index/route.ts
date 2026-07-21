import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";
import { createCronRoute } from "@/lib/api-middleware";

export const dynamic = "force-dynamic";

export const GET = createCronRoute(async () => {
  try {
    const { indexAllPendingContent } = await import("@/lib/search/indexer");
    const result = await indexAllPendingContent();

    logger.info({ ...result }, "Scheduled content indexing completed");

    return NextResponse.json({
      success: true,
      indexed: result.indexed,
      skipped: result.skipped,
      failed: result.failed,
      message: `Indexed ${result.indexed} file(s) (${result.skipped} skipped, ${result.failed} failed).`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({ err: message }, "Scheduled content indexing failed");
    return NextResponse.json(
      { error: "Content indexing failed.", details: message },
      { status: 500 },
    );
  }
});

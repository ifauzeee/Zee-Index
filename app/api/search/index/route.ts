import { NextResponse } from "next/server";
import { createAdminRoute } from "@/lib/api-middleware";
import { indexFileContent, indexAllPendingContent } from "@/lib/search/indexer";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * POST /api/search/index
 *
 * Triggers content indexing for one or all pending files.
 *
 * Body (JSON):
 *   - fileId?: string  — index a specific file
 *   - all?: boolean    — index all pending files (when fileId is omitted)
 */
export const POST = createAdminRoute(async ({ body }) => {
  const { fileId, all } = (body || {}) as {
    fileId?: string;
    all?: boolean;
  };

  if (fileId) {
    // Index a single file — fetch its metadata from the index first
    const { db } = await import("@/lib/db");
    const file = await db.fileIndex.findUnique({ where: { id: fileId } });
    if (!file) {
      return NextResponse.json(
        { error: "File not found in index" },
        { status: 404 },
      );
    }

    const ok = await indexFileContent(
      file.id,
      file.name,
      file.mimeType,
      file.size,
    );
    return NextResponse.json({
      indexed: ok,
      fileId: file.id,
      fileName: file.name,
    });
  }

  if (all) {
    // Index all pending files (those without contentText)
    const result = await indexAllPendingContent();
    logger.info({ ...result }, "Batch content indexing completed");
    return NextResponse.json(result);
  }

  return NextResponse.json(
    { error: "Provide fileId or { all: true }" },
    { status: 400 },
  );
});

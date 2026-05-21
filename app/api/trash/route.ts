import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";
import { createAdminRoute } from "@/lib/api-middleware";
import { listTrashedFiles, restoreTrash, deleteForever } from "@/lib/drive";
import { z } from "zod";

export const dynamic = "force-dynamic";

const trashActionSchema = z
  .object({
    fileId: z.string().min(1).optional(),
    fileIds: z.array(z.string().min(1)).min(1).optional(),
  })
  .superRefine((value, ctx) => {
    if (!value.fileId && !value.fileIds) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "File ID or IDs are required",
      });
    }
  });

export const GET = createAdminRoute(async () => {
  try {
    const files = await listTrashedFiles();
    return NextResponse.json(files);
  } catch (error) {
    logger.error({ err: error }, "Trash GET Error");
    return NextResponse.json(
      { error: "Failed to fetch trash" },
      { status: 500 },
    );
  }
});

export const POST = createAdminRoute(
  async ({ body }) => {
    try {
      const idsToProcess = body.fileIds ?? body.fileId!;
      await restoreTrash(idsToProcess);
      return NextResponse.json({ success: true });
    } catch (error) {
      logger.error({ err: error }, "Trash Restore Error");
      return NextResponse.json({ error: "Failed to restore" }, { status: 500 });
    }
  },
  { bodySchema: trashActionSchema },
);

export const DELETE = createAdminRoute(
  async ({ body }) => {
    try {
      const idsToProcess = body.fileIds ?? body.fileId!;
      await deleteForever(idsToProcess);
      return NextResponse.json({ success: true });
    } catch (error) {
      logger.error({ err: error }, "Trash Delete Error");
      return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
    }
  },
  { bodySchema: trashActionSchema },
);

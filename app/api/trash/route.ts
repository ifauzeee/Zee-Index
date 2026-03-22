import { NextResponse } from "next/server";
import { createAdminRoute } from "@/lib/api-middleware";
import { listTrashedFiles, restoreTrash, deleteForever } from "@/lib/drive";

export const dynamic = "force-dynamic";

export const GET = createAdminRoute(async () => {
  try {
    const files = await listTrashedFiles();
    return NextResponse.json(files);
  } catch (error) {
    console.error("Trash GET Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch trash" },
      { status: 500 },
    );
  }
});

export const POST = createAdminRoute(async ({ request }) => {
  try {
    const { fileId, fileIds } = await request.json();
    const idsToProcess = fileIds || fileId;
    if (!idsToProcess) {
      return NextResponse.json(
        { error: "File ID or IDs are required" },
        { status: 400 },
      );
    }
    await restoreTrash(idsToProcess);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Trash Restore Error:", error);
    return NextResponse.json({ error: "Failed to restore" }, { status: 500 });
  }
});

export const DELETE = createAdminRoute(async ({ request }) => {
  try {
    const { fileId, fileIds } = await request.json();
    const idsToProcess = fileIds || fileId;
    if (!idsToProcess) {
      return NextResponse.json(
        { error: "File ID or IDs are required" },
        { status: 400 },
      );
    }
    await deleteForever(idsToProcess);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Trash Delete Error:", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
});

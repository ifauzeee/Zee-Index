import { NextResponse, NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { listTrashedFiles, restoreTrash, deleteForever } from "@/lib/drive";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
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
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  try {
    const { fileId, fileIds } = await req.json();
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
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  try {
    const { fileId, fileIds } = await req.json();
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
}

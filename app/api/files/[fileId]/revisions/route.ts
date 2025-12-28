import { NextResponse, NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { listFileRevisions } from "@/lib/drive";

export async function GET(
  req: NextRequest,
  { params }: { params: { fileId: string } },
) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  try {
    const revisions = await listFileRevisions(params.fileId);
    return NextResponse.json(revisions);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch revisions" },
      { status: 500 },
    );
  }
}

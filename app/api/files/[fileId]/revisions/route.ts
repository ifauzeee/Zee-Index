import { NextResponse, NextRequest } from "next/server";
import { auth } from "@/auth";
import { listFileRevisions } from "@/lib/drive";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ fileId: string }> },
) {
  const params = await props.params;
  const session = await auth();
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

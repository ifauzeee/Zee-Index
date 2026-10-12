import { NextResponse } from "next/server";
import { createAdminRoute } from "@/lib/api-middleware";
import { listFileRevisions } from "@/lib/drive";
import { isDriveId } from "@/lib/drive/ids";

export const dynamic = "force-dynamic";

export const GET = createAdminRoute(async ({ params }) => {
  if (!isDriveId(params.fileId)) {
    return NextResponse.json({ error: "Invalid Drive id." }, { status: 400 });
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
});

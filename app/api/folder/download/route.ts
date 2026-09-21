import { NextResponse } from "next/server";
import { createEditorRoute } from "@/lib/api-middleware";
import { createFolderZipStream, FolderZipError } from "@/lib/zip";
import { getErrorMessage } from "@/lib/errors";
import { Readable } from "stream";

export const dynamic = "force-dynamic";

export const GET = createEditorRoute(async ({ request }) => {
  const { searchParams } = new URL(request.url);
  const folderId = searchParams.get("folderId");

  if (!folderId || folderId === "virtual-root") {
    return NextResponse.json(
      { error: "A concrete folder id is required" },
      { status: 400 },
    );
  }

  try {
    const { stream } = await createFolderZipStream(folderId);
    const webStream = Readable.toWeb(stream);

    return new NextResponse(webStream as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="zee-index-folder.zip"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = getErrorMessage(error);
    const status = error instanceof FolderZipError ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
});

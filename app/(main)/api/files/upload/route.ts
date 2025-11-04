import { NextResponse, NextRequest } from "next/server";
import { getAccessToken } from "@/lib/googleDrive";
import { type Session } from "next-auth";
import { invalidateFolderCache } from "@/lib/cache";
import { withAdminSession } from "@/lib/api-middleware";

export const POST = withAdminSession(
  async (request: NextRequest, context: {}, session: Session) => {
    try {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      const parentId = formData.get("parentId") as string | null;

      if (!file || !parentId) {
        return NextResponse.json(
          { error: "File dan ID folder induk diperlukan." },
          { status: 400 },
        );
      }

      const accessToken = await getAccessToken();
      const metadata = {
        name: file.name,
        parents: [parentId],
      };

      const body = new Blob([
        `--boundary\r\n`,
        `Content-Type: application/json; charset=UTF-8\r\n\r\n`,
        `${JSON.stringify(metadata)}\r\n\r\n`,
        `--boundary\r\n`,
        `Content-Type: ${file.type}\r\n\r\n`,
        await file.arrayBuffer(),
        `\r\n--boundary--`,
      ]);

      const response = await fetch(
        "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": `multipart/related; boundary=boundary`,
          },
          body,
        },
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(
          data.error?.message || "Gagal mengunggah file ke Google Drive.",
        );
      }

      await invalidateFolderCache(parentId);

      return NextResponse.json(data, { status: 200 });
    } catch (error: any) {
      console.error("Upload API Error:", error);
      return NextResponse.json(
        { error: error.message || "Internal Server Error." },
        { status: 500 },
      );
    }
  },
);
import { NextResponse, NextRequest } from "next/server";
import { getAccessToken } from "@/lib/googleDrive";
import { kv } from "@/lib/kv";
import { logActivity } from "@/lib/activityLogger";

export const maxDuration = 60;

const FILE_REQUESTS_KEY = "zee-index:file-requests";

interface FileRequestData {
  folderId: string;
  expiresAt: number;
  folderName: string;
}

export async function POST(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const uploadType = searchParams.get("type");
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Token required" }, { status: 401 });
  }

  const requestData = await kv.hget<FileRequestData>(FILE_REQUESTS_KEY, token);
  if (!requestData || Date.now() > requestData.expiresAt) {
    return NextResponse.json(
      { error: "Invalid or expired token" },
      { status: 403 },
    );
  }

  try {
    const accessToken = await getAccessToken();

    if (uploadType === "init") {
      const { name, mimeType, size } = await request.json();

      const finalName = name;

      const metadata = {
        name: finalName,
        mimeType,
        parents: [requestData.folderId],
      };

      const response = await fetch(
        "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
            "X-Upload-Content-Length": size.toString(),
            "X-Upload-Content-Type": mimeType,
          },
          body: JSON.stringify(metadata),
        },
      );

      if (!response.ok) throw new Error("Failed to init upload");
      const uploadUrl = response.headers.get("Location");
      return NextResponse.json({ uploadUrl });
    } else if (uploadType === "chunk") {
      const uploadUrl = searchParams.get("uploadUrl");
      const contentRange = request.headers.get("Content-Range");

      if (!uploadUrl || !contentRange) {
        return NextResponse.json({ error: "Missing params" }, { status: 400 });
      }

      const chunkBuffer = await request.arrayBuffer();

      const driveResponse = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Length": chunkBuffer.byteLength.toString(),
          "Content-Range": contentRange,
        },
        body: chunkBuffer,
      });

      if (driveResponse.status === 308) {
        return NextResponse.json({ status: "partial" });
      }

      if (driveResponse.ok) {
        const fileData = await driveResponse.json();

        const rolesToInvalidate = ["ADMIN", "USER", "GUEST"];
        for (const role of rolesToInvalidate) {
          await kv.del(`folder:content:${requestData.folderId}:${role}:page1`);
        }

        await logActivity("UPLOAD", {
          itemName: fileData.name,
          itemSize: fileData.size,
          userEmail: "Public Uploader",
          destinationFolder: requestData.folderName,
        });

        return NextResponse.json({ status: "completed", file: fileData });
      }

      throw new Error("Chunk upload failed");
    }
  } catch (error: unknown) {
    console.error("Public Upload Error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }

  return NextResponse.json({ error: "Invalid type" }, { status: 400 });
}

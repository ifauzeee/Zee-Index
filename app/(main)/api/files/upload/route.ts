import { NextResponse, NextRequest } from "next/server";
import { getAccessToken } from "@/lib/googleDrive";
import { withAdminSession } from "@/lib/api-middleware";
import { logActivity } from "@/lib/activityLogger";

export const maxDuration = 60;

export const POST = withAdminSession(
  async (request: NextRequest, context: {}, session: any) => {
    const searchParams = request.nextUrl.searchParams;
    const uploadType = searchParams.get("type");

    try {
      const accessToken = await getAccessToken();

      if (uploadType === "init") {
        const { name, mimeType, parentId, size } = await request.json();

        const metadata = {
          name,
          mimeType,
          parents: [parentId],
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
          }
        );

        if (!response.ok) {
          throw new Error("Gagal menginisialisasi sesi upload dengan Google Drive.");
        }

        const uploadUrl = response.headers.get("Location");
        return NextResponse.json({ uploadUrl });
      }

      else if (uploadType === "chunk") {
        const uploadUrl = searchParams.get("uploadUrl");
        const contentRange = request.headers.get("Content-Range");
        const contentLength = request.headers.get("Content-Length");

        if (!uploadUrl || !contentRange) {
          return NextResponse.json(
            { error: "Parameter uploadUrl atau header Content-Range hilang." },
            { status: 400 }
          );
        }

        const chunkBuffer = await request.arrayBuffer();

        const driveResponse = await fetch(uploadUrl, {
          method: "PUT",
          headers: {
            "Content-Length": contentLength || chunkBuffer.byteLength.toString(),
            "Content-Range": contentRange,
          },
          body: chunkBuffer,
        });

        if (driveResponse.status === 308) {
          return NextResponse.json({ status: "partial" });
        }

        if (driveResponse.ok) {
          const fileData = await driveResponse.json();
          
          await logActivity("UPLOAD", {
            itemName: fileData.name,
            itemSize: fileData.size,
            userEmail: session.user?.email,
            status: "success",
          });

          return NextResponse.json({ status: "completed", file: fileData });
        }

        throw new Error("Gagal mengunggah chunk ke Google Drive.");
      } 
      
      else {
        return NextResponse.json({ error: "Invalid upload type" }, { status: 400 });
      }

    } catch (error: any) {
      console.error("Upload API Error:", error);
      return NextResponse.json(
        { error: error.message || "Internal Server Error." },
        { status: 500 }
      );
    }
  }
);

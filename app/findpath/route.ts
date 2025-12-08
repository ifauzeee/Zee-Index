import { NextRequest, NextResponse } from "next/server";
import { getAccessToken } from "@/lib/googleDrive";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const fileId = searchParams.get("id");
  
  if (!fileId) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  try {
    const accessToken = await getAccessToken();

    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,mimeType,parents,trashed&supportsAllDrives=true&includeItemsFromAllDrives=true`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
      }
    );

    if (!response.ok) {
        return NextResponse.redirect(new URL("/", request.url));
    }

    const file = await response.json();

    if (!file || file.trashed) {
        return NextResponse.redirect(new URL("/", request.url));
    }

    if (file.mimeType === "application/vnd.google-apps.folder") {
      return NextResponse.redirect(new URL(`/folder/${file.id}`, request.url));
    }

    const rootFolderId = process.env.NEXT_PUBLIC_ROOT_FOLDER_ID || "root";
    const parentId = file.parents?.[0] || rootFolderId;
    
    const slug = encodeURIComponent((file.name || "view").replace(/\s+/g, "-").toLowerCase());

    return NextResponse.redirect(
      new URL(`/folder/${parentId}/file/${file.id}/${slug}`, request.url)
    );

  } catch (error) {
    console.error("FindPath Error:", error);
    return NextResponse.redirect(new URL("/", request.url));
  }
}
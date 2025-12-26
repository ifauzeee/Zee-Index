import { NextRequest, NextResponse } from "next/server";
import { getAccessToken, invalidateAccessToken } from "@/lib/googleDrive";

export const dynamic = "force-dynamic";

async function fetchFileMetadata(
  fileId: string,
  currentToken: string,
  retryCount = 0,
): Promise<any> {
  const cleanId = fileId.split("&")[0].split("?")[0].trim();

  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${cleanId}?fields=id,name,mimeType,parents,trashed,shortcutDetails&supportsAllDrives=true`,
    {
      headers: {
        Authorization: `Bearer ${currentToken}`,
      },
      cache: "no-store",
    },
  );

  if (response.status === 401 && retryCount < 2) {
    await invalidateAccessToken();
    const newToken = await getAccessToken();
    return fetchFileMetadata(cleanId, newToken, retryCount + 1);
  }

  if ((response.status === 429 || response.status >= 500) && retryCount < 3) {
    await new Promise((resolve) =>
      setTimeout(resolve, 1000 * (retryCount + 1)),
    );
    return fetchFileMetadata(cleanId, currentToken, retryCount + 1);
  }

  if (!response.ok) {
    return null;
  }

  return response.json();
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const searchParams = url.searchParams;

  let fileId = searchParams.get("id");
  let shouldView = searchParams.get("view") === "true";

  if (!fileId) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (fileId.includes("view=true")) {
    shouldView = true;
    fileId = fileId.replace(/[\?&]view=true/g, "").trim();
  }

  fileId = fileId.split("&")[0].split("?")[0].trim();

  try {
    const accessToken = await getAccessToken();
    let file = await fetchFileMetadata(fileId, accessToken);

    if (!file) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    if (
      file.mimeType === "application/vnd.google-apps.shortcut" &&
      file.shortcutDetails?.targetId
    ) {
      const targetToken = await getAccessToken();
      const targetFile = await fetchFileMetadata(
        file.shortcutDetails.targetId,
        targetToken,
      );
      if (targetFile) {
        file = targetFile;
      }
    }

    if (file.trashed) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    let destinationPath = "";

    if (file.mimeType === "application/vnd.google-apps.folder") {
      destinationPath = `/folder/${file.id}`;
    } else {
      const rootFolderId = process.env.NEXT_PUBLIC_ROOT_FOLDER_ID || "root";
      const parentId =
        file.parents && file.parents.length > 0
          ? file.parents[0]
          : rootFolderId;
      const slug = encodeURIComponent(
        (file.name || "view").replace(/\s+/g, "-").toLowerCase(),
      );

      destinationPath = `/folder/${parentId}/file/${file.id}/${slug}`;
    }

    const destinationUrl = new URL(destinationPath, request.url);

    if (shouldView) {
      destinationUrl.searchParams.set("view", "true");
    }

    return NextResponse.redirect(destinationUrl);
  } catch (error) {
    console.error(error);
    return NextResponse.redirect(new URL("/", request.url));
  }
}

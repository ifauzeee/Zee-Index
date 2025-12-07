import { redirect } from "next/navigation";
import { getAccessToken } from "@/lib/googleDrive";

const createSlug = (name: string) =>
  encodeURIComponent((name || "view").replace(/\s+/g, "-").toLowerCase());

export default async function FindPathPage({
  searchParams,
}: {
  searchParams: { id?: string; view?: string };
}) {
  const fileId = searchParams.id;
  const viewMode = searchParams.view === "true";

  if (!fileId) {
    redirect("/");
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
      },
    );

    if (!response.ok) {
      throw new Error(`Metadata fetch failed: ${response.status}`);
    }

    const file = await response.json();

    if (!file || file.trashed) {
      throw new Error("File not found or trashed");
    }

    if (file.mimeType === "application/vnd.google-apps.folder") {
      redirect(`/folder/${file.id}`);
    } else {
      if (viewMode) {
        const parentId =
          file.parents?.[0] || process.env.NEXT_PUBLIC_ROOT_FOLDER_ID;
        const slug = createSlug(file.name);

        redirect(`/folder/${parentId}/file/${file.id}/${slug}`);
      } else {
        redirect(`/api/download?fileId=${file.id}`);
      }
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes("NEXT_REDIRECT")) {
      throw error;
    }

    console.error("FindPath Error:", error);

    if (viewMode) {
      const rootId = process.env.NEXT_PUBLIC_ROOT_FOLDER_ID || "root";
      redirect(`/folder/${rootId}/file/${fileId}/view`);
    } else {
      redirect(`/api/download?fileId=${fileId}`);
    }
  }
}

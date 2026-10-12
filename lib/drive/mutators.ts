import { getAccessToken } from "./auth";
import { logger } from "@/lib/logger";
import { assertDriveId } from "@/lib/drive/ids";

const MAX_CONCURRENT = 10;

async function runLimited<T>(
  items: T[],
  fn: (item: T) => Promise<Response>,
): Promise<Response[]> {
  const results: Response[] = [];
  for (let i = 0; i < items.length; i += MAX_CONCURRENT) {
    const batch = items.slice(i, i + MAX_CONCURRENT);
    results.push(...(await Promise.all(batch.map(fn))));
  }
  return results;
}

export async function restoreTrash(fileId: string | string[]) {
  const ids = Array.isArray(fileId) ? fileId : [fileId];
  ids.forEach(assertDriveId);
  const accessToken = await getAccessToken();

  const results = await runLimited(ids, (id) =>
    fetch(`https://www.googleapis.com/drive/v3/files/${id}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ trashed: false }),
    }),
  );
  results.forEach((res) => {
    if (!res.ok) {
      logger.error(`Failed to restore a file: ${res.statusText}`);
    }
  });
}

export async function deleteForever(fileId: string | string[]) {
  const ids = Array.isArray(fileId) ? fileId : [fileId];
  ids.forEach(assertDriveId);
  const accessToken = await getAccessToken();

  const results = await runLimited(ids, (id) =>
    fetch(`https://www.googleapis.com/drive/v3/files/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
  );
  results.forEach((res) => {
    if (!res.ok) {
      logger.error(`Failed to delete a file forever: ${res.statusText}`);
    }
  });
}

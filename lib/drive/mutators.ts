import { getAccessToken } from "./auth";
import { fetchWithRetry } from "./client";
import { logger } from "@/lib/logger";

export async function restoreTrash(fileId: string | string[]) {
  const accessToken = await getAccessToken();
  const ids = Array.isArray(fileId) ? fileId : [fileId];

  const restorePromises = ids.map((id) => {
    return fetch(`https://www.googleapis.com/drive/v3/files/${id}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ trashed: false }),
    });
  });

  const results = await Promise.all(restorePromises);
  results.forEach((res) => {
    if (!res.ok) {
      logger.error(`Failed to restore a file: ${res.statusText}`);
    }
  });
}

export async function deleteForever(fileId: string | string[]) {
  const accessToken = await getAccessToken();
  const ids = Array.isArray(fileId) ? fileId : [fileId];

  const deletePromises = ids.map((id) => {
    return fetch(`https://www.googleapis.com/drive/v3/files/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  });

  const results = await Promise.all(deletePromises);
  results.forEach((res) => {
    if (!res.ok) {
      logger.error(`Failed to delete a file forever: ${res.statusText}`);
    }
  });
}

export async function copyFile(
  fileId: string,
  destinationFolderId: string,
  newName?: string,
) {
  const accessToken = await getAccessToken();
  const driveUrl = `https://www.googleapis.com/drive/v3/files/${fileId}/copy`;

  const requestBody: { parents?: string[]; name?: string } = {
    parents: [destinationFolderId],
  };
  if (newName) {
    requestBody.name = newName;
  }

  const response = await fetch(driveUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || "Gagal menyalin file");
  }

  const result = await response.json();
  return {
    id: result.id,
    name: result.name || newName,
    mimeType: result.mimeType,
    parents: result.parents,
  };
}

export async function updateFileContent(fileId: string, newContent: string) {
  const accessToken = await getAccessToken();
  const url = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`;

  const response = await fetchWithRetry(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "text/plain",
    },
    body: newContent,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error?.message || "Gagal memperbarui konten file.",
    );
  }

  return response.json();
}

export async function uploadToDrive(
  parentId: string,
  fileName: string,
  buffer: Buffer,
  mimeType: string,
): Promise<{ id: string; name: string; mimeType: string }> {
  const accessToken = await getAccessToken();
  const metadata = {
    name: fileName,
    parents: parentId ? [parentId] : undefined,
  };

  const boundary = "314159265358979323846";
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--\r\n`;

  const metadataPart =
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    JSON.stringify(metadata);

  const mediaPartHeader =
    `Content-Type: ${mimeType}\r\n` +
    `Content-Transfer-Encoding: base64\r\n\r\n`;

  const mediaPartBody = buffer.toString("base64");

  const multipartBody = Buffer.concat([
    Buffer.from(delimiter),
    Buffer.from(metadataPart),
    Buffer.from(delimiter),
    Buffer.from(mediaPartHeader),
    Buffer.from(mediaPartBody),
    Buffer.from(closeDelimiter),
  ]);

  const response = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
        "Content-Length": String(multipartBody.length),
      },
      body: multipartBody,
    },
  );

  if (!response.ok) {
    const errorBody = await response.text();
    logger.error({ errorBody }, "[Drive] Multipart upload failed");
    throw new Error(`Google Drive upload failed: ${response.statusText}`);
  }

  return response.json();
}

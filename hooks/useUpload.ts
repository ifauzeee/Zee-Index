import { useState, useCallback, useRef } from "react";
import { useAppStore } from "@/lib/store";
import { parseDroppedItems, FileEntry } from "@/lib/fileParser";
import { useTranslations } from "next-intl";

interface UseUploadProps {
  currentFolderId: string;
  isAdmin: boolean;
  triggerRefresh: () => void;
}

const CHUNK_SIZE = 2 * 1024 * 1024;
const MAX_CONCURRENT_UPLOADS = 3;
const MAX_RETRIES = 3;

const retryFetch = async (
  url: string,
  options: RequestInit,
  retries = MAX_RETRIES,
): Promise<Response> => {
  try {
    const res = await fetch(url, options);
    if (!res.ok && retries > 0 && res.status >= 500) {
      throw new Error(`Server error: ${res.status}`);
    }
    return res;
  } catch (err) {
    if (retries > 0) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return retryFetch(url, options, retries - 1);
    }
    throw err;
  }
};

export function useUpload({
  currentFolderId,
  isAdmin,
  triggerRefresh,
}: UseUploadProps) {
  const { uploads, updateUploadProgress, removeUpload, addToast } =
    useAppStore();
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const folderIdCache = useRef<Record<string, string>>({});
  const activeUploadsCount = useRef(0);
  const uploadQueue = useRef<(() => Promise<void>)[]>([]);
  const t = useTranslations("UploadModal");

  const processNextInQueue = useCallback(async () => {
    if (
      uploadQueue.current.length === 0 ||
      activeUploadsCount.current >= MAX_CONCURRENT_UPLOADS
    )
      return;

    const nextTask = uploadQueue.current.shift();
    if (nextTask) {
      activeUploadsCount.current++;
      try {
        await nextTask();
      } finally {
        activeUploadsCount.current--;
        processNextInQueue();
      }
    }
  }, []);

  const addToQueue = useCallback(
    (task: () => Promise<void>) => {
      uploadQueue.current.push(task);
      processNextInQueue();
    },
    [processNextInQueue],
  );

  const ensureFolderStructure = useCallback(
    async (path: string, rootId: string): Promise<string> => {
      const parts = path.split("/").filter(Boolean);
      parts.pop();
      if (parts.length === 0) return rootId;

      let currentParentId = rootId;
      let currentPath = "";

      for (const folderName of parts) {
        currentPath += (currentPath ? "/" : "") + folderName;

        if (folderIdCache.current[currentPath]) {
          currentParentId = folderIdCache.current[currentPath];
          continue;
        }

        try {
          // No concurrency limit for folder creation to avoid bottlenecks, but could be added
          const response = await fetch("/api/folder/create", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              folderName: folderName,
              parentId: currentParentId,
            }),
          });

          if (!response.ok) throw new Error(t("folderCreationFailed"));

          const data = await response.json();
          currentParentId = data.id;
          folderIdCache.current[currentPath] = data.id;
        } catch (error) {
          console.error(`Gagal membuat folder ${folderName}:`, error);
          throw error;
        }
      }

      return currentParentId;
    },
    [t],
  );

  const uploadFileChunked = useCallback(
    async (file: File, targetParentId: string) => {
      try {
        updateUploadProgress(file.name, 0, "uploading");

        const initRes = await retryFetch("/api/files/upload?type=init", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: file.name,
            mimeType: file.type || "application/octet-stream",
            parentId: targetParentId,
            size: file.size,
          }),
        });

        if (!initRes.ok) throw new Error(t("initFailed"));
        const { uploadUrl } = await initRes.json();

        let start = 0;
        while (start < file.size) {
          const end = Math.min(start + CHUNK_SIZE, file.size);
          const chunk = file.slice(start, end);

          const contentRange = `bytes ${start}-${end - 1}/${file.size}`;

          const chunkRes = await retryFetch(
            `/api/files/upload?type=chunk&uploadUrl=${encodeURIComponent(
              uploadUrl,
            )}&parentId=${targetParentId}`,
            {
              method: "POST",
              headers: {
                "Content-Range": contentRange,
                "Content-Type": "application/octet-stream",
              },
              body: chunk,
            },
          );

          if (!chunkRes.ok) throw new Error(t("chunkFailed"));
          const chunkData = await chunkRes.json();
          const percent = Math.round((end / file.size) * 100);
          updateUploadProgress(file.name, percent, "uploading");

          if (chunkData.status === "completed") {
            updateUploadProgress(file.name, 100, "success");
            triggerRefresh(); // Refresh immediately after success
            setTimeout(() => {
              removeUpload(file.name);
            }, 5000);
            return;
          }
          start = end;
        }
      } catch (error: unknown) {
        console.error(error);
        const errorMessage =
          error instanceof Error ? error.message : "Upload failed";
        updateUploadProgress(file.name, 0, "error", errorMessage);
        addToast({
          message: t("uploadError", { fileName: file.name }),
          type: "error",
        });
      }
    },
    [updateUploadProgress, removeUpload, addToast, t, triggerRefresh],
  );

  const processUploadQueue = useCallback(
    async (items: FileList | FileEntry[]) => {
      if (!currentFolderId) {
        addToast({
          message: t("destNotFound"),
          type: "error",
        });
        return;
      }
      if (!isAdmin) {
        addToast({
          message: t("accessDenied"),
          type: "error",
        });
        return;
      }

      folderIdCache.current = {};

      const fileList = Array.isArray(items)
        ? items
        : Array.from(items).map((f) => ({
            file: f,
            path: (f as any).webkitRelativePath || f.name,
          }));

      // Pre-process folders sequentially to ensure structure, then parallel upload files
      // Simple optimization: Group by path?
      // For now, simplify: Ensure folder structure for each file (cached) then add to upload queue

      for (const entry of fileList) {
        addToQueue(async () => {
          try {
            const targetId = await ensureFolderStructure(
              entry.path,
              currentFolderId,
            );
            await uploadFileChunked(entry.file, targetId);
          } catch (e) {
            console.error(
              "Skip file karena gagal create folder:",
              entry.path,
              e,
            );
          }
        });
      }
    },
    [
      currentFolderId,
      isAdmin,
      addToast,
      ensureFolderStructure,
      uploadFileChunked,
      addToQueue,
      t,
    ],
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processUploadQueue(e.target.files);
      e.target.value = "";
      setIsUploadModalOpen(false);
    }
  };

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (isAdmin) setIsDragging(true);
    },
    [isAdmin],
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDropUpload = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (isAdmin && e.dataTransfer) {
        const entries = await parseDroppedItems(e.dataTransfer);
        if (entries.length > 0) {
          processUploadQueue(entries);
        }
      }
    },
    [isAdmin, processUploadQueue],
  );

  return {
    uploads,
    isUploadModalOpen,
    isDragging,
    setIsUploadModalOpen,
    handleDragOver,
    handleDragLeave,
    handleDropUpload,
    handleFileSelect,
    droppedFiles: null,
  };
}

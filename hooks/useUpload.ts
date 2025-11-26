import { useState, useCallback, useRef } from "react";
import { useAppStore } from "@/lib/store";
import { parseDroppedItems, FileEntry } from "@/lib/fileParser";

interface UploadProgress {
  name: string;
  progress: number;
  status: "uploading" | "success" | "error";
  error?: string;
}

interface UseUploadProps {
  currentFolderId: string;
  isAdmin: boolean;
  triggerRefresh: () => void;
}

const CHUNK_SIZE = 4 * 1024 * 1024;

export function useUpload({
  currentFolderId,
  isAdmin,
  triggerRefresh,
}: UseUploadProps) {
  const [uploads, setUploads] = useState<Record<string, UploadProgress>>({});
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const { addToast } = useAppStore();
  const folderIdCache = useRef<Record<string, string>>({});

  const updateUploadProgress = useCallback(
    (
      fileName: string,
      progress: number,
      status: "uploading" | "success" | "error",
      error?: string,
    ) => {
      setUploads((prev) => ({
        ...prev,
        [fileName]: { name: fileName, progress, status, error },
      }));
      if (status === "success") {
        setTimeout(() => {
          setUploads((prev) => {
            const newUploads = { ...prev };
            delete newUploads[fileName];
            return newUploads;
          });
        }, 5000);
      }
    },
    [],
  );

  const ensureFolderStructure = async (
    path: string,
    rootId: string,
  ): Promise<string> => {
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
        const response = await fetch("/api/folder/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            folderName: folderName,
            parentId: currentParentId,
          }),
        });

        if (!response.ok) throw new Error("Gagal membuat folder struktur");

        const data = await response.json();
        currentParentId = data.id;
        folderIdCache.current[currentPath] = data.id;
      } catch (error) {
        console.error(`Gagal membuat folder ${folderName}:`, error);
        throw error;
      }
    }

    return currentParentId;
  };

  const uploadFileChunked = useCallback(
    async (file: File, targetParentId: string) => {
      try {
        updateUploadProgress(file.name, 0, "uploading");

        const initRes = await fetch("/api/files/upload?type=init", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: file.name,
            mimeType: file.type || "application/octet-stream",
            parentId: targetParentId,
            size: file.size,
          }),
        });

        if (!initRes.ok) throw new Error("Gagal inisialisasi upload");
        const { uploadUrl } = await initRes.json();

        let start = 0;
        while (start < file.size) {
          const end = Math.min(start + CHUNK_SIZE, file.size);
          const chunk = file.slice(start, end);

          const contentRange = `bytes ${start}-${end - 1}/${file.size}`;

          const chunkRes = await fetch(
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

          if (!chunkRes.ok) throw new Error("Gagal upload chunk");
          const chunkData = await chunkRes.json();
          const percent = Math.round((end / file.size) * 100);
          updateUploadProgress(file.name, percent, "uploading");

          if (chunkData.status === "completed") {
            updateUploadProgress(file.name, 100, "success");
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
          message: `Gagal mengupload ${file.name}`,
          type: "error",
        });
      }
    },
    [updateUploadProgress, addToast],
  );

  const processUploadQueue = useCallback(
    async (items: FileList | FileEntry[]) => {
      if (!currentFolderId) {
        addToast({
          message: "Folder tujuan tidak ditemukan (ID null).",
          type: "error",
        });
        return;
      }
      if (!isAdmin) {
        addToast({
          message: "Akses ditolak: Anda bukan Admin.",
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

      for (const entry of fileList) {
        try {
          const targetId = await ensureFolderStructure(
            entry.path,
            currentFolderId,
          );
          await uploadFileChunked(entry.file, targetId);
        } catch (e) {
          console.error("Skip file karena gagal create folder:", entry.path, e);
        }
      }

      triggerRefresh();
    },
    [currentFolderId, isAdmin, triggerRefresh, uploadFileChunked, addToast],
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
    handleFileUpload: () => {},
  };
}

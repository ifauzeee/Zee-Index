import { useState, useCallback } from "react";
import { useAppStore } from "@/lib/store";

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

const CHUNK_SIZE = 5 * 1024 * 1024;

export function useUpload({
  currentFolderId,
  isAdmin,
  triggerRefresh,
}: UseUploadProps) {
  const [uploads, setUploads] = useState<Record<string, UploadProgress>>({});
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [droppedFiles, setDroppedFiles] = useState<FileList | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const { addToast } = useAppStore(); 

  const updateUploadProgress = useCallback(
    (
      fileName: string,
      progress: number,
      status: "uploading" | "success" | "error",
      error?: string
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
    []
  );

  const uploadFileChunked = useCallback(async (file: File) => {
    try {
      updateUploadProgress(file.name, 0, "uploading");

      const initRes = await fetch("/api/files/upload?type=init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: file.name,
          mimeType: file.type || "application/octet-stream",
          parentId: currentFolderId,
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
          `/api/files/upload?type=chunk&uploadUrl=${encodeURIComponent(uploadUrl)}`,
          {
            method: "POST",
            headers: {
              "Content-Range": contentRange,
              "Content-Type": "application/octet-stream",
            },
            body: chunk,
          }
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
    } catch (error: any) {
      console.error(error);
      updateUploadProgress(file.name, 0, "error", error.message);
      addToast({ message: `Gagal mengupload ${file.name}`, type: "error" });
    }
  }, [currentFolderId, updateUploadProgress, addToast]);

  const handleFileUpload = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0 || !currentFolderId || !isAdmin) return;

      for (const file of Array.from(files)) {
        await uploadFileChunked(file);
      }
      triggerRefresh();
    },
    [currentFolderId, isAdmin, triggerRefresh, uploadFileChunked]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isAdmin) setIsDragging(true);
  }, [isAdmin]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDropUpload = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (isAdmin && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files);
    }
  }, [isAdmin, handleFileUpload]);

  return {
    uploads,
    isUploadModalOpen,
    droppedFiles,
    isDragging,
    handleFileUpload,
    setIsUploadModalOpen,
    setDroppedFiles,
    handleDragOver,
    handleDragLeave,
    handleDropUpload,
  };
}

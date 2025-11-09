import { useState, useCallback } from "react";
import React from "react";

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

export function useUpload({
  currentFolderId,
  isAdmin,
  triggerRefresh,
}: UseUploadProps) {
  const [uploads, setUploads] = useState<Record<string, UploadProgress>>({});
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [droppedFiles, setDroppedFiles] = useState<FileList | null>(null);
  const [isDragging, setIsDragging] = useState(false);

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
      if (status === "success" || status === "error") {
        setTimeout(() => {
          setUploads((prev) => {
            const newUploads = { ...prev };
            delete newUploads[fileName];
            return newUploads;
          });
        }, 5000);
      }
    },
    [setUploads],
  );

  const handleFileUpload = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0 || !currentFolderId || !isAdmin) return;

      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("parentId", currentFolderId);

        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/files/upload", true);

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percentComplete = (event.loaded / event.total) * 100;
            updateUploadProgress(file.name, percentComplete, "uploading");
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            updateUploadProgress(file.name, 100, "success");
            triggerRefresh();
          } else {
            try {
              const errorResponse = JSON.parse(xhr.responseText);
              updateUploadProgress(
                file.name,
                0,
                "error",
                errorResponse.error || "Upload gagal",
              );
            } catch {
              updateUploadProgress(
                file.name,
                0,
                "error",
                "Terjadi kesalahan server",
              );
            }
          }
        };
        xhr.onerror = () => {
          updateUploadProgress(
            file.name,
            0,
            "error",
            "Kesalahan jaringan saat mengunggah",
          );
        };

        updateUploadProgress(file.name, 0, "uploading");
        xhr.send(formData);
      }
    },
    [currentFolderId, triggerRefresh, isAdmin, updateUploadProgress],
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (isAdmin) {
        setIsDragging(true);
      }
    },
    [isAdmin],
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDropUpload = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      if (isAdmin && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleFileUpload(e.dataTransfer.files);
      }
    },
    [isAdmin, handleFileUpload],
  );

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
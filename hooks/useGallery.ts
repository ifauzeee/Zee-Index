import { useState, useMemo, useCallback } from "react";
import type { DriveFile } from "@/lib/googleDrive";
import { getFileType } from "@/lib/utils";

export function useGallery(files: DriveFile[]) {
  const [isOpen, setIsOpen] = useState(false);
  const [startIndex, setStartIndex] = useState(0);

  const imageFiles = useMemo(() => {
    return files.filter((f) => getFileType(f) === "image");
  }, [files]);

  const openGallery = useCallback(
    (fileId: string) => {
      const index = imageFiles.findIndex((img) => img.id === fileId);
      if (index !== -1) {
        setStartIndex(index);
        setIsOpen(true);
        return true;
      }
      return false;
    },
    [imageFiles],
  );

  const closeGallery = useCallback(() => {
    setIsOpen(false);
  }, []);

  return {
    isOpen,
    startIndex,
    imageFiles,
    openGallery,
    closeGallery,
  };
}

"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import Loading from "@/components/Loading";
import FileList from "@/components/FileList";
import type { DriveFile } from "@/lib/googleDrive";
import { motion } from "framer-motion";
import { StarOff } from "lucide-react";
import React from "react";

export default function FavoritesPage() {
  const router = useRouter();
  const { addToast, shareToken } = useAppStore();
  const [favoriteFiles, setFavoriteFiles] = useState<DriveFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const createSlug = (name: string) =>
    encodeURIComponent(name.replace(/\s+/g, "-").toLowerCase());
  const fetchFavorites = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/favorites");
      if (!response.ok) throw new Error("Gagal mengambil data favorit.");
      const data = await response.json();
      setFavoriteFiles(data);
    } catch (err: any) {
      addToast({ message: err.message, type: "error" });
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);
  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);
  const handleItemClick = useCallback(
    (file: DriveFile) => {
      const parentFolder = file.parents?.[0];
      let destinationUrl = "";
      if (file.isFolder) {
        destinationUrl = `/folder/${file.id}`;
      } else if (parentFolder) {
        destinationUrl = `/folder/${parentFolder}/file/${file.id}/${createSlug(
          file.name,
        )}`;
      } else {
        addToast({
          message: "Tidak dapat menemukan lokasi file.",
          type: "error",
        });
        return;
      }
      router.push(destinationUrl);
    },
    [router, addToast],
  );
  if (isLoading) {
    return <Loading />;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <h1 className="text-xl font-bold mb-4">File Favorit</h1>
      {favoriteFiles.length > 0 ? (
        <FileList
          files={favoriteFiles}
          onItemClick={handleItemClick}
          onItemContextMenu={(e) => e.preventDefault()}
          activeFileId={null}
        />
      ) : (
        <div className="text-center py-20 text-muted-foreground">
          <StarOff className="mx-auto h-16 w-16" />
          <p className="mt-4">Anda belum memiliki file favorit.</p>
          <p className="text-sm">
            Klik kanan pada file untuk menambahkannya ke favorit.
          </p>
        </div>
      )}
    </motion.div>
  );
}

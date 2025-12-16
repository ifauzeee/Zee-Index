"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import Loading from "@/components/Loading";
import FileList from "@/components/FileList";
import type { DriveFile } from "@/lib/googleDrive";
import { motion } from "framer-motion";
import { StarOff, LogIn } from "lucide-react";
import React from "react";
import EmptyState from "@/components/EmptyState";

export default function FavoritesPage() {
  const router = useRouter();
  const { addToast, user } = useAppStore();
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
    } catch (err: unknown) {
      addToast({
        message: err instanceof Error ? err.message : "Terjadi galat.",
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);
  useEffect(() => {
    if (user && !user.isGuest) {
      fetchFavorites();
    } else if (user?.isGuest) {
      setIsLoading(false);
    }
  }, [fetchFavorites, user]);
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
  if (user?.isGuest) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-xl font-bold mb-4">File Favorit</h1>
        <div className="text-center py-20 text-muted-foreground">
          <EmptyState
            icon={LogIn}
            title="Fitur Favorit Memerlukan Akun"
            message="Anda harus login dengan akun Google untuk dapat menyimpan file atau folder ke favorit."
          />
        </div>
      </motion.div>
    );
  }

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
          onItemContextMenu={() => {}}
          activeFileId={null}
          onShareClick={() => {}}
          onDetailsClick={() => {}}
          onDownloadClick={() => {}}
          isAdmin={false}
          onDragStart={() => {}}
          onFileDrop={() => {}}
        />
      ) : (
        <div className="text-center py-20 text-muted-foreground">
          <EmptyState
            icon={StarOff}
            title="Belum Ada Favorit"
            message="Klik kanan pada file untuk menambahkannya ke favorit."
          />
        </div>
      )}
    </motion.div>
  );
}

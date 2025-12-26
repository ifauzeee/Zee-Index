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
import { useTranslations } from "next-intl";

export default function FavoritesPage() {
  const router = useRouter();
  const { addToast, user } = useAppStore();
  const [favoriteFiles, setFavoriteFiles] = useState<DriveFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const t = useTranslations("FavoritesPage");
  const createSlug = (name: string) =>
    encodeURIComponent(name.replace(/\s+/g, "-").toLowerCase());
  const fetchFavorites = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/favorites");
      if (!response.ok) throw new Error(t("loadError"));
      const data = await response.json();
      setFavoriteFiles(data);
    } catch (err: unknown) {
      addToast({
        message: err instanceof Error ? err.message : t("genericError"),
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  }, [addToast, t]);
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
          message: t("locationError"),
          type: "error",
        });
        return;
      }
      router.push(destinationUrl);
    },
    [router, addToast, t],
  );
  if (user?.isGuest) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-xl font-bold mb-4">{t("title")}</h1>
        <div className="text-center py-20 text-muted-foreground">
          <EmptyState
            icon={LogIn}
            title={t("requireAccountTitle")}
            message={t("requireAccountMessage")}
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
      <h1 className="text-xl font-bold mb-4">{t("title")}</h1>
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
            title={t("emptyTitle")}
            message={t("emptyMessage")}
          />
        </div>
      )}
    </motion.div>
  );
}

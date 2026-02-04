"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import Loading from "@/components/common/Loading";
import FileList from "@/components/file-browser/FileList";
import type { DriveFile } from "@/lib/drive";
import { motion } from "framer-motion";
import { StarOff, LogIn } from "lucide-react";
import React from "react";
import EmptyState from "@/components/file-browser/EmptyState";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";

export default function FavoritesPage() {
  const router = useRouter();
  const { addToast, user } = useAppStore();
  const t = useTranslations("FavoritesPage");
  const createSlug = (name: string) =>
    encodeURIComponent(name.replace(/\s+/g, "-").toLowerCase());

  const {
    data: favoriteFiles = [],
    isLoading,
    error,
  } = useQuery<DriveFile[]>({
    queryKey: ["favorites"],
    queryFn: async () => {
      const response = await fetch("/api/favorites");
      if (!response.ok) throw new Error(t("loadError"));
      return response.json();
    },
    enabled: !!user && !user.isGuest,
    initialData: [],
  });

  React.useEffect(() => {
    if (error) {
      addToast({
        message: error instanceof Error ? error.message : t("genericError"),
        type: "error",
      });
    }
  }, [error, addToast, t]);

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
          navigatingId={null}
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

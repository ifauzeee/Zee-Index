"use client";
import { useState, useEffect, useCallback, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useAppStore } from "@/lib/store";
import Loading from "@/components/common/Loading";
import FileList from "@/components/file-browser/FileList";
import type { DriveFile } from "@/lib/drive";
import { motion } from "framer-motion";
import React from "react";
import EmptyState from "@/components/file-browser/EmptyState";
import { Link, SearchX } from "lucide-react";
import { useTranslations } from "next-intl";

function SharedCollectionPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { addToast, user } = useAppStore();
  const shareId = params.shareId as string;
  const shareToken = searchParams.get("share_token");
  const t = useTranslations("SharedCollectionPage");

  const [items, setItems] = useState<DriveFile[]>([]);
  const [collectionName, setCollectionName] = useState(t("defaultName"));
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const createSlug = (name: string) =>
    encodeURIComponent(name.replace(/\s+/g, "-").toLowerCase());

  const isAdmin = user?.role === "ADMIN" && !user?.isGuest;
  const handleItemClick = useCallback(
    (file: DriveFile) => {
      let destinationUrl = "";
      const parentFolder = file.parents?.[0];

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

      if (shareToken) {
        destinationUrl += `?share_token=${shareToken}`;
      }
      router.push(destinationUrl);
    },
    [router, shareToken, addToast, t],
  );
  useEffect(() => {
    if (!shareId || !shareToken) {
      setError(t("invalidLink"));
      setIsLoading(false);
      return;
    }

    const fetchCollectionItems = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const url = new URL(
          `/api/share/items/${shareId}`,
          window.location.origin,
        );
        url.searchParams.append("share_token", shareToken);

        const response = await fetch(url.toString());
        const data = await response.json();

        if (!response.ok) {
          if (response.status === 401) {
            router.push(`/login?callbackUrl=${window.location.pathname}`);
          }
          throw new Error(data.error || t("loadError"));
        }

        setItems(data.items);
        setCollectionName(data.collectionName || t("defaultName"));
      } catch (err: unknown) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error.";
        setError(errorMessage);
        addToast({ message: errorMessage, type: "error" });
      } finally {
        setIsLoading(false);
      }
    };

    fetchCollectionItems();
  }, [shareId, shareToken, addToast, router, t]);

  if (isLoading) {
    return <Loading />;
  }

  return (
    <motion.div
      className="py-3"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <h1 className="text-xl font-bold mb-8 flex items-center gap-2">
        <Link size={20} /> {collectionName}
      </h1>
      {error ? (
        <div className="mt-8 text-center py-20 text-muted-foreground">
          <EmptyState icon={SearchX} title={t("failedTitle")} message={error} />
        </div>
      ) : items.length > 0 ? (
        <FileList
          files={items}
          onItemClick={handleItemClick}
          onItemContextMenu={() => {}}
          activeFileId={null}
          onShareClick={() => {}}
          onDetailsClick={() => {}}
          onDownloadClick={() => {}}
          isAdmin={isAdmin}
          onDragStart={() => {}}
          onFileDrop={() => {}}
        />
      ) : (
        <div className="mt-8 text-center py-20 text-muted-foreground">
          <EmptyState
            icon={SearchX}
            title={t("emptyTitle")}
            message={t("emptyMessage")}
          />
        </div>
      )}
    </motion.div>
  );
}

export default function SharedCollectionPageSuspense() {
  return (
    <Suspense fallback={<Loading />}>
      <SharedCollectionPage />
    </Suspense>
  );
}

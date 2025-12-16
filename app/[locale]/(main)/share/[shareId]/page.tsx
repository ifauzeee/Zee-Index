"use client";
import { useState, useEffect, useCallback, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useAppStore } from "@/lib/store";
import Loading from "@/components/Loading";
import FileList from "@/components/FileList";
import type { DriveFile } from "@/lib/googleDrive";
import { motion } from "framer-motion";
import React from "react";
import EmptyState from "@/components/EmptyState";
import { Link, SearchX } from "lucide-react";

function SharedCollectionPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { addToast, user } = useAppStore();
  const shareId = params.shareId as string;
  const shareToken = searchParams.get("share_token");

  const [items, setItems] = useState<DriveFile[]>([]);
  const [collectionName, setCollectionName] = useState("Koleksi Bersama");
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
          message: "Tidak dapat menentukan lokasi file.",
          type: "error",
        });
        return;
      }

      if (shareToken) {
        destinationUrl += `?share_token=${shareToken}`;
      }
      router.push(destinationUrl);
    },
    [router, shareToken, addToast],
  );
  useEffect(() => {
    if (!shareId || !shareToken) {
      setError("Tautan berbagi tidak valid atau tidak lengkap.");
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
          throw new Error(data.error || "Gagal mengambil item koleksi.");
        }

        setItems(data.items);
        setCollectionName(data.collectionName || "Koleksi Bersama");
      } catch (err: unknown) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Terjadi kesalahan tidak dikenal.";
        setError(errorMessage);
        addToast({ message: errorMessage, type: "error" });
      } finally {
        setIsLoading(false);
      }
    };

    fetchCollectionItems();
  }, [shareId, shareToken, addToast, router]);

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
          <EmptyState icon={SearchX} title="Gagal Memuat" message={error} />
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
            title="Koleksi Kosong"
            message="Tidak ada item yang ditemukan di koleksi ini."
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

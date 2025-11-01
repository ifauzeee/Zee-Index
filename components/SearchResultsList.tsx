"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import Loading from "@/components/Loading";
import FileList from "@/components/FileList";
import type { DriveFile } from "@/lib/googleDrive";
import { motion } from "framer-motion";
import React from "react";
import EmptyState from "./EmptyState";
import { SearchX } from "lucide-react";

export default function SearchResultsList() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchTerm = searchParams.get("q");
  const folderId = searchParams.get("folderId");
  const { shareToken, addToast, currentFolderId, user } = useAppStore();

  const [results, setResults] = useState<DriveFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const createSlug = (name: string) =>
    encodeURIComponent(name.replace(/\s+/g, "-").toLowerCase());

  const isAdmin = user?.role === "ADMIN" && !user?.isGuest;

  const handleItemClick = useCallback(
    (file: DriveFile) => {
      let destinationUrl = "";
      const parentFolder = file.parents?.[0] || currentFolderId;

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
    [router, shareToken, addToast, currentFolderId],
  );
  const fetchSearchResults = useCallback(async () => {
    if (!searchTerm) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    setResults([]);

    try {
      const isGlobalSearch = !folderId;
      const apiPath = isGlobalSearch ? "/api/search/global" : "/api/search";

      const url = new URL(apiPath, window.location.origin);
      url.searchParams.append("q", searchTerm);

      if (!isGlobalSearch && folderId) {
        url.searchParams.append("folderId", folderId);
      }

      if (shareToken) {
        url.searchParams.append("share_token", shareToken);
      }

      const response = await fetch(url.toString());
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Gagal mencari file.");
      }

      setResults(data.files);
    } catch (err: any) {
      setError(err.message);
      addToast({ message: err.message, type: "error" });
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, folderId, addToast, shareToken]);
  useEffect(() => {
    fetchSearchResults();
  }, [fetchSearchResults]);

  if (isLoading) {
    return <Loading />;
  }

  if (error) {
    return <div className="text-center py-20 text-red-500">Error: {error}</div>;
  }

  return (
    <motion.div
      className="py-3"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <h1 className="text-xl font-bold mb-8">
        Hasil Pencarian untuk &quot;{searchTerm}&quot;
      </h1>
      {results.length > 0 ? (
        <FileList
          files={results}
          onItemClick={handleItemClick}
          onItemContextMenu={() => {}}
          activeFileId={null}
          onShareClick={() => {}}
          onDetailsClick={() => {}}
          onDownloadClick={() => {}}
          isAdmin={isAdmin}
        />
      ) : (
        <div className="mt-8 text-center py-20 text-muted-foreground">
          <EmptyState
            icon={SearchX}
            title="Tidak Ditemukan"
            message="Tidak ada file atau folder yang cocok dengan pencarian Anda."
          />
        </div>
      )}
    </motion.div>
  );
}

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useAppStore } from "@/lib/store";
import {
  X,
  Globe,
  FileText,
  ScanText,
  Filter,
  Calendar,
  HardDrive,
  File,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface SearchProps {
  onSearchClose?: () => void;
}

export default function Search({ onSearchClose }: SearchProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { currentFolderId } = useAppStore();

  const [searchTerm, setSearchTerm] = useState("");
  const [searchType, setSearchType] = useState<"name" | "fullText">("name");
  const [isGlobalSearch, setIsGlobalSearch] = useState(!currentFolderId);
  const inputRef = useRef<HTMLInputElement>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const [mimeType, setMimeType] = useState("any");
  const [modifiedTime, setModifiedTime] = useState("any");
  const [minSize, setMinSize] = useState("");

  const performSearch = useCallback(
    (term: string) => {
      if (
        term.trim() ||
        mimeType !== "any" ||
        modifiedTime !== "any" ||
        minSize
      ) {
        const params = new URLSearchParams();
        params.set("q", term.trim());
        params.set("searchType", searchType);
        params.set("mimeType", mimeType);
        params.set("modifiedTime", modifiedTime);
        if (minSize) params.set("minSize", minSize);

        if (!isGlobalSearch && currentFolderId) {
          params.set("folderId", currentFolderId);
        }

        router.push(`/search?${params.toString()}`);
        onSearchClose?.();
      } else {
        const basePath =
          currentFolderId === process.env.NEXT_PUBLIC_ROOT_FOLDER_ID
            ? "/"
            : `/folder/${currentFolderId}`;
        if (pathname.startsWith("/search")) {
          router.push(basePath);
        }
      }
    },
    [
      router,
      searchType,
      isGlobalSearch,
      currentFolderId,
      onSearchClose,
      pathname,
      mimeType,
      modifiedTime,
      minSize,
    ],
  );

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (
        !pathname.startsWith("/search") &&
        searchTerm.trim() === "" &&
        mimeType === "any" &&
        modifiedTime === "any" &&
        !minSize
      ) {
        return;
      }
    }, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchTerm]);

  useEffect(() => {
    const query = searchParams.get("q");
    if (pathname.startsWith("/search")) {
      setSearchTerm(query || "");
      setMimeType(searchParams.get("mimeType") || "any");
      setModifiedTime(searchParams.get("modifiedTime") || "any");
      setMinSize(searchParams.get("minSize") || "");
    }
  }, [searchParams, pathname]);

  useEffect(() => {
    if (!pathname.startsWith("/search")) {
      setSearchTerm("");
      setMimeType("any");
      setModifiedTime("any");
      setMinSize("");
      setAdvancedOpen(false);
    }
  }, [pathname]);

  useEffect(() => {
    setIsGlobalSearch(!currentFolderId);
  }, [currentFolderId]);

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    performSearch(searchTerm);
  };

  const clearSearch = () => {
    setSearchTerm("");
    setMimeType("any");
    setModifiedTime("any");
    setMinSize("");
    setAdvancedOpen(false);
    inputRef.current?.focus();
    const basePath =
      currentFolderId === process.env.NEXT_PUBLIC_ROOT_FOLDER_ID
        ? "/"
        : `/folder/${currentFolderId}`;
    router.push(basePath);
  };

  const placeholderText = isGlobalSearch
    ? "Cari semua file..."
    : "Cari di folder ini...";

  return (
    <form onSubmit={handleFormSubmit} className="w-full relative">
      <div className="relative w-full">
        <button
          type="button"
          onClick={() => setAdvancedOpen(!advancedOpen)}
          className="absolute inset-y-0 left-0 flex items-center justify-center w-10 text-muted-foreground hover:text-foreground"
          title="Filter Lanjutan"
        >
          <Filter size={18} className={advancedOpen ? "text-primary" : ""} />
        </button>

        <input
          ref={inputRef}
          type="search"
          placeholder={placeholderText}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-32 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary transition-shadow text-sm"
        />

        {searchTerm && (
          <button
            type="button"
            onClick={clearSearch}
            className="absolute inset-y-0 right-20 flex items-center justify-center w-10 text-muted-foreground hover:text-foreground"
            title="Hapus"
          >
            <X size={18} />
          </button>
        )}
        <button
          type="button"
          onClick={() =>
            setSearchType((prev) => (prev === "name" ? "fullText" : "name"))
          }
          className="absolute inset-y-0 right-10 flex items-center justify-center w-10 text-muted-foreground hover:text-foreground"
          title={
            searchType === "name"
              ? "Cari berdasarkan nama"
              : "Cari berdasarkan konten"
          }
        >
          {searchType === "name" ? (
            <FileText size={18} />
          ) : (
            <ScanText size={18} className="text-primary" />
          )}
        </button>
        <button
          type="button"
          onClick={() => setIsGlobalSearch(!isGlobalSearch)}
          className="absolute inset-y-0 right-0 flex items-center justify-center w-10 text-muted-foreground hover:text-foreground"
          title={
            isGlobalSearch
              ? "Pencarian Global Aktif"
              : "Aktifkan Pencarian Global"
          }
        >
          <Globe size={18} className={isGlobalSearch ? "text-primary" : ""} />
        </button>
      </div>
      <AnimatePresence>
        {advancedOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full left-0 right-0 z-10 mt-2 p-4 bg-card border rounded-lg shadow-lg grid grid-cols-1 md:grid-cols-3 gap-4"
          >
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <File size={12} /> Tipe File
              </label>
              <select
                value={mimeType}
                onChange={(e) => setMimeType(e.target.value)}
                className="w-full px-3 py-1.5 border rounded-md bg-background text-sm focus:ring-1 focus:ring-primary"
              >
                <option value="any">Semua</option>
                <option value="image">Gambar</option>
                <option value="video">Video</option>
                <option value="audio">Audio</option>
                <option value="pdf">PDF</option>
                <option value="folder">Folder</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Calendar size={12} /> Waktu Diubah
              </label>
              <select
                value={modifiedTime}
                onChange={(e) => setModifiedTime(e.target.value)}
                className="w-full px-3 py-1.5 border rounded-md bg-background text-sm focus:ring-1 focus:ring-primary"
              >
                <option value="any">Kapan Saja</option>
                <option value="today">Hari Ini</option>
                <option value="week">Minggu Ini</option>
                <option value="month">Bulan Ini</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <HardDrive size={12} /> Min Size (MB)
              </label>
              <input
                type="number"
                placeholder="Contoh: 100"
                value={minSize}
                onChange={(e) => setMinSize(e.target.value)}
                className="w-full px-3 py-1.5 border rounded-md bg-background text-sm focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="md:col-span-3 flex justify-end">
              <button
                type="submit"
                className="bg-primary text-primary-foreground px-4 py-1.5 rounded-md text-sm font-medium"
              >
                Terapkan Filter
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </form>
  );
}

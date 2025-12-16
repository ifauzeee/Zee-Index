"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useAppStore } from "@/lib/store";
import { useConfirm } from "@/components/providers/ModalProvider";
import { motion } from "framer-motion";
import { Trash2, Loader2, FileX, ArrowDownUp } from "lucide-react";
import { formatBytes } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Checkbox } from "@/components/ui/checkbox";

interface TrashedFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime: string;
}

type SortKey = "modifiedTime" | "name" | "size";
type SortOrder = "asc" | "desc";

export default function TrashPage() {
  const { user, addToast, fetchUser } = useAppStore();
  const { confirm } = useConfirm();
  const { data: session, status } = useSession();
  const router = useRouter();

  const [files, setFiles] = useState<TrashedFile[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [sort, setSort] = useState<{ key: SortKey; order: SortOrder }>({
    key: "modifiedTime",
    order: "desc",
  });

  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (status === "authenticated" && !user) fetchUser();
  }, [status, user, fetchUser]);

  useEffect(() => {
    if (status === "loading") return;
    if (
      status === "unauthenticated" ||
      (session?.user?.role && session.user.role !== "ADMIN")
    ) {
      addToast({
        message: "Akses Ditolak: Halaman ini khusus Admin",
        type: "error",
      });
      router.push("/");
    }
  }, [status, session, router, addToast]);

  const fetchTrash = useCallback(async () => {
    setIsLoadingData(true);
    try {
      const res = await fetch("/api/trash");
      if (!res.ok) throw new Error("Gagal memuat sampah");
      const data = await res.json();
      setFiles(data);
    } catch {
      addToast({ message: "Gagal memuat sampah", type: "error" });
    } finally {
      setIsLoadingData(false);
    }
  }, [addToast]);

  useEffect(() => {
    if (
      status === "authenticated" &&
      (session?.user?.role === "ADMIN" || user?.role === "ADMIN")
    ) {
      fetchTrash();
    }
  }, [status, session, user, fetchTrash]);

  const sortedFiles = useMemo(() => {
    return [...files].sort((a, b) => {
      const isAsc = sort.order === "asc" ? 1 : -1;
      if (sort.key === "name") {
        return a.name.localeCompare(b.name, "id", { numeric: true }) * isAsc;
      }
      if (sort.key === "size") {
        return (parseInt(a.size || "0") - parseInt(b.size || "0")) * isAsc;
      }
      return (
        (new Date(a.modifiedTime).getTime() -
          new Date(b.modifiedTime).getTime()) *
        isAsc
      );
    });
  }, [files, sort]);

  const handleSort = (key: SortKey) => {
    setSort((prev) => ({
      key,
      order: prev.key === key && prev.order === "desc" ? "asc" : "desc",
    }));
  };

  const toggleSelectAll = () => {
    if (selectedFiles.length === files.length) {
      setSelectedFiles([]);
    } else {
      setSelectedFiles(files.map((f) => f.id));
    }
  };

  const toggleSelectFile = (fileId: string) => {
    setSelectedFiles((prev) =>
      prev.includes(fileId)
        ? prev.filter((id) => id !== fileId)
        : [...prev, fileId],
    );
  };

  const handleBulkAction = async (action: "restore" | "delete") => {
    const isDelete = action === "delete";
    if (
      isDelete &&
      !(await confirm(
        `Hapus ${selectedFiles.length} item secara permanen? Aksi ini tidak dapat dibatalkan.`,
        { title: "Hapus Permanen?", variant: "destructive" },
      ))
    )
      return;

    setIsProcessing(true);
    try {
      const response = await fetch("/api/trash", {
        method: isDelete ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileIds: selectedFiles }),
      });
      if (!response.ok)
        throw new Error(`Gagal ${isDelete ? "menghapus" : "memulihkan"}`);
      addToast({
        message: `${selectedFiles.length} item berhasil di${isDelete ? "hapus" : "pulihkan"}.`,
        type: "success",
      });
      await fetchTrash();
      setSelectedFiles([]);
    } catch (e) {
      addToast({
        message: e instanceof Error ? e.message : "Terjadi kesalahan",
        type: "error",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (
    status === "loading" ||
    (status === "authenticated" && user?.role !== "ADMIN")
  ) {
    return (
      <div className="flex justify-center h-96 items-center">
        <Loader2 className="animate-spin h-8 w-8 text-primary" />
      </div>
    );
  }

  const renderHeader = () => (
    <div className="flex items-center justify-between mb-8">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-red-100 text-red-600 rounded-xl">
          <Trash2 size={24} />
        </div>
        <h1 className="text-2xl font-bold">Sampah (Trash)</h1>
      </div>
      <div className="flex items-center gap-2">
        {selectedFiles.length > 0 && (
          <>
            <button
              onClick={() => handleBulkAction("restore")}
              disabled={isProcessing}
              className="px-3 py-2 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 disabled:opacity-50"
            >
              Pulihkan ({selectedFiles.length})
            </button>
            <button
              onClick={() => handleBulkAction("delete")}
              disabled={isProcessing}
              className="px-3 py-2 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 disabled:opacity-50"
            >
              Hapus ({selectedFiles.length})
            </button>
          </>
        )}
        <button
          onClick={() => handleSort("modifiedTime")}
          className="p-2 bg-muted rounded-lg hover:bg-muted/80"
          title="Urutkan berdasarkan tanggal diubah"
        >
          <ArrowDownUp size={18} />
        </button>
      </div>
    </div>
  );

  const renderFileList = () => (
    <div className="bg-card border rounded-xl overflow-hidden">
      <div className="p-4 flex items-center border-b bg-muted/30">
        <Checkbox
          id="select-all"
          checked={
            selectedFiles.length > 0 && selectedFiles.length === files.length
          }
          onCheckedChange={toggleSelectAll}
          aria-label="Select all"
          className="mr-4"
        />
        <label htmlFor="select-all" className="font-medium">
          Pilih Semua
        </label>
      </div>
      <div className="divide-y">
        {sortedFiles.map((file) => (
          <div
            key={file.id}
            className="p-4 flex items-center justify-between hover:bg-muted/50"
          >
            <div className="flex items-center gap-3 overflow-hidden flex-1">
              <Checkbox
                checked={selectedFiles.includes(file.id)}
                onCheckedChange={() => toggleSelectFile(file.id)}
                id={`select-${file.id}`}
                aria-label={`Select ${file.name}`}
              />
              <label
                htmlFor={`select-${file.id}`}
                className="truncate cursor-pointer flex-1"
              >
                <p className="font-medium truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatBytes(parseInt(file.size || "0"))} •{" "}
                  {new Date(file.modifiedTime).toLocaleDateString()}
                </p>
              </label>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="py-6"
    >
      {renderHeader()}
      {isLoadingData ? (
        <div className="flex justify-center h-64 items-center">
          <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
        </div>
      ) : files.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <FileX className="w-16 h-16 mx-auto mb-4 opacity-20" />
          <p>Tong sampah kosong.</p>
        </div>
      ) : (
        renderFileList()
      )}
    </motion.div>
  );
}

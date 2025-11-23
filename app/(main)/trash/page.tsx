"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";
import { motion } from "framer-motion";
import { Trash2, RefreshCcw, Loader2, FileX } from "lucide-react";
import { formatBytes } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface TrashedFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime: string;
}

export default function TrashPage() {
  const { user, addToast, fetchUser } = useAppStore();
  const { data: session, status } = useSession();
  const router = useRouter();
  const [files, setFiles] = useState<TrashedFile[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (status === "authenticated" && !user) {
      fetchUser();
    }
  }, [status, user, fetchUser]);

  useEffect(() => {
    if (status === "loading") return;

    if (status === "unauthenticated") {
      router.push("/");
      return;
    }

    if (session?.user?.role && session.user.role !== "ADMIN") {
      addToast({
        message: "Akses Ditolak: Halaman ini khusus Admin",
        type: "error",
      });
      router.push("/");
    }
  }, [status, session, router, addToast]);

  useEffect(() => {
    const isAdmin = session?.user?.role === "ADMIN" || user?.role === "ADMIN";

    if (status === "authenticated" && isAdmin) {
      const fetchTrash = async () => {
        setIsLoadingData(true);
        try {
          const res = await fetch("/api/trash");
          if (!res.ok) throw new Error("Gagal");
          const data = await res.json();
          setFiles(data);
        } catch (e) {
          console.error(e);
          addToast({ message: "Gagal memuat sampah", type: "error" });
        } finally {
          setIsLoadingData(false);
        }
      };
      fetchTrash();
    }
  }, [status, session, user, addToast]);

  const handleRestore = async (fileId: string) => {
    setIsProcessing(true);
    try {
      await fetch("/api/trash", {
        method: "POST",
        body: JSON.stringify({ fileId }),
      });
      addToast({ message: "File dipulihkan", type: "success" });
      const res = await fetch("/api/trash");
      const data = await res.json();
      setFiles(data);
    } catch {
      addToast({ message: "Gagal memulihkan", type: "error" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteForever = async (fileId: string) => {
    if (!confirm("Hapus permanen? Tidak bisa dikembalikan.")) return;
    setIsProcessing(true);
    try {
      await fetch("/api/trash", {
        method: "DELETE",
        body: JSON.stringify({ fileId }),
      });
      addToast({ message: "Dihapus permanen", type: "success" });
      const res = await fetch("/api/trash");
      const data = await res.json();
      setFiles(data);
    } catch {
      addToast({ message: "Gagal menghapus", type: "error" });
    } finally {
      setIsProcessing(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="flex justify-center h-96 items-center">
        <Loader2 className="animate-spin h-8 w-8 text-primary" />
      </div>
    );
  }

  if (session?.user?.role !== "ADMIN" && user?.role !== "ADMIN") {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="py-6"
    >
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-red-100 text-red-600 rounded-xl">
          <Trash2 size={24} />
        </div>
        <h1 className="text-2xl font-bold">Sampah (Trash)</h1>
      </div>

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
        <div className="bg-card border rounded-xl overflow-hidden">
          <div className="divide-y">
            {files.map((file) => (
              <div
                key={file.id}
                className="p-4 flex items-center justify-between hover:bg-muted/50"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="truncate">
                    <p className="font-medium truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatBytes(parseInt(file.size || "0"))} •{" "}
                      {new Date(file.modifiedTime).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    disabled={isProcessing}
                    onClick={() => handleRestore(file.id)}
                    className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200"
                    title="Pulihkan"
                  >
                    <RefreshCcw size={18} />
                  </button>
                  <button
                    disabled={isProcessing}
                    onClick={() => handleDeleteForever(file.id)}
                    className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                    title="Hapus Permanen"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

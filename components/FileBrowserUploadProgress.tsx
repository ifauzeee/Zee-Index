import React from "react";
import { motion } from "framer-motion";
import { File as FileIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface UploadProgressProps {
  uploads: Record<
    string,
    {
      name: string;
      progress: number;
      status: "uploading" | "success" | "error";
      error?: string;
    }
  >;
}

export default function FileBrowserUploadProgress({
  uploads,
}: UploadProgressProps) {
  if (Object.keys(uploads).length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[9990] w-80 space-y-3">
      {Object.values(uploads).map((up) => (
        <motion.div
          layout
          key={up.name}
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.9 }}
          className="p-4 rounded-lg shadow-lg bg-card border"
        >
          <div className="flex justify-between items-center text-sm mb-1">
            <p className="truncate font-medium flex items-center gap-2">
              <FileIcon size={14} />
              <span className="max-w-[150px] truncate">{up.name}</span>
            </p>
            <span
              className={cn(
                "text-xs font-mono",
                up.status === "error" && "text-red-500",
                up.status === "success" && "text-green-500",
              )}
            >
              {up.status === "uploading" && `${up.progress.toFixed(0)}%`}
              {up.status === "success" && `Selesai`}
              {up.status === "error" && `Gagal`}
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
            <div
              className={cn(
                "h-2 rounded-full transition-all",
                up.status === "error" ? "bg-red-500" : "bg-primary",
              )}
              style={{ width: `${up.progress}%` }}
            ></div>
          </div>
          {up.status === "error" && (
            <p className="text-xs text-red-500 mt-1">{up.error}</p>
          )}
        </motion.div>
      ))}
    </div>
  );
}

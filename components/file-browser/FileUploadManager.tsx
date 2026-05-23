"use client";

import { useAppStore } from "@/lib/store";
import {
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";

export default function FileUploadManager() {
  const t = useTranslations("FileUploadManager");
  const { uploads, removeUpload } = useAppStore();
  const [isExpanded, setIsExpanded] = useState(true);

  const uploadList = Object.values(uploads);
  if (uploadList.length === 0) return null;

  const uploadingCount = uploadList.filter(
    (u) => u.status === "uploading",
  ).length;
  const completedCount = uploadList.filter(
    (u) => u.status === "success",
  ).length;
  const errorCount = uploadList.filter((u) => u.status === "error").length;

  return (
    <div className="fixed bottom-6 right-6 z-[100] w-80 shadow-2xl rounded-xl border bg-card overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between p-3 bg-primary text-primary-foreground cursor-pointer select-none"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span className="text-sm font-semibold">
          {uploadingCount > 0
            ? t("uploadingFiles", { count: uploadingCount })
            : t("uploadsComplete", { count: completedCount + errorCount })}
        </span>
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronUp className="w-4 h-4" />
          )}
          <X
            className="w-4 h-4 hover:scale-110 transition-transform"
            onClick={(e) => {
              e.stopPropagation();
              uploadList.forEach((u) => {
                if (u.status !== "uploading") removeUpload(u.name);
              });
              if (uploadingCount === 0) setIsExpanded(false);
            }}
          />
        </div>
      </div>

      {/* Body */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            className="max-h-64 overflow-y-auto"
          >
            {uploadList.map((upload) => (
              <div
                key={upload.name}
                className="p-3 border-b border-muted flex items-start gap-3 last:border-0 hover:bg-muted/30 transition-colors"
              >
                <div className="mt-1">
                  {upload.status === "uploading" && (
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  )}
                  {upload.status === "success" && (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  )}
                  {upload.status === "error" && (
                    <AlertCircle className="w-5 h-5 text-destructive" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p
                    className="text-sm font-medium truncate"
                    title={upload.name}
                  >
                    {upload.name}
                  </p>

                  {upload.status === "uploading" && (
                    <div className="mt-2">
                      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${upload.progress}%` }}
                          className="h-full bg-primary transition-all duration-300"
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground mt-1">
                        {t("uploadingProgress", {
                          progress: upload.progress,
                        })}
                      </span>
                    </div>
                  )}

                  {upload.status === "success" && (
                    <span className="text-[10px] text-green-500 font-medium">
                      {t("uploaded")}
                    </span>
                  )}

                  {upload.status === "error" && (
                    <span className="text-[10px] text-destructive font-medium truncate block">
                      {upload.error || t("uploadFailed")}
                    </span>
                  )}
                </div>

                {upload.status !== "uploading" && (
                  <button
                    onClick={() => removeUpload(upload.name)}
                    className="p-1 hover:bg-muted rounded transition-colors"
                  >
                    <X className="w-3 h-3 text-muted-foreground" />
                  </button>
                )}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

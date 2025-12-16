"use client";

import { useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { useRouter } from "@/lib/navigation";
import { Pin, Folder, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import type { DriveFile } from "@/lib/googleDrive";
import { useTranslations } from "next-intl";

export default function PinnedSection() {
  const { pinnedFolders, fetchPinnedFolders, currentFolderId, shareToken } =
    useAppStore();
  const t = useTranslations("PinnedSection");
  const router = useRouter();
  const rootId = process.env.NEXT_PUBLIC_ROOT_FOLDER_ID;

  const isRoot = !currentFolderId || currentFolderId === rootId;

  useEffect(() => {
    fetchPinnedFolders();
  }, [fetchPinnedFolders]);

  if (!isRoot || pinnedFolders.length === 0) return null;

  const handleClick = (folder: DriveFile) => {
    let url = `/folder/${folder.id}`;
    if (shareToken) url += `?share_token=${shareToken}`;
    router.push(url);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6"
    >
      <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider px-1">
        <Pin size={14} className="text-primary" />
        <span>{t("pinned")}</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {pinnedFolders.map((folder) => (
          <div
            key={folder.id}
            onClick={() => handleClick(folder)}
            className="group flex items-center gap-3 p-3 bg-card hover:bg-accent/50 border rounded-xl cursor-pointer transition-all hover:shadow-sm active:scale-95"
          >
            <div className="p-2 bg-primary/10 rounded-lg text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
              <Folder size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate text-foreground group-hover:text-primary transition-colors">
                {folder.name}
              </p>
              <p className="text-[10px] text-muted-foreground truncate">
                {t("pinnedFolder")}
              </p>
            </div>
            <ChevronRight
              size={14}
              className="text-muted-foreground/30 group-hover:text-primary/50"
            />
          </div>
        ))}
      </div>
    </motion.div>
  );
}

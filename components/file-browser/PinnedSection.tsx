"use client";

import { useRouter } from "next/navigation";
import { Pin, Folder, PinOff, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import type { DriveFile } from "@/lib/drive";
import { useTranslations } from "next-intl";
import { usePinnedFoldersQuery } from "@/hooks/usePinnedFolders";
import { useAppStore } from "@/lib/store";

export default function PinnedSection() {
  const { data: pinnedFolders = [] } = usePinnedFoldersQuery();
  const { currentFolderId, shareToken } = useAppStore();
  const router = useRouter();
  const t = useTranslations("PinnedSection");
  const rootId = process.env.NEXT_PUBLIC_ROOT_FOLDER_ID;

  const isRoot = !currentFolderId || currentFolderId === rootId;

  if (!isRoot) return null;

  const handleClick = (folder: DriveFile) => {
    let url = `/folder/${folder.id}`;
    if (shareToken) url += `?share_token=${shareToken}`;
    router.push(url);
  };

  if (pinnedFolders.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 p-4 bg-card border border-dashed rounded-xl text-sm text-muted-foreground"
      >
        <PinOff size={18} className="text-muted-foreground/50 shrink-0" />
        <span>{t("emptyHint")}</span>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider px-1">
        <Pin size={14} className="text-primary" />
        <span>{t("title")}</span>
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
                {t("folderSubtitle")}
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

"use client";

import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { TreeNode, TreeContext } from "./TreeNode";
import NavSection from "./NavSection";
import DriveList from "./DriveList";
import type { ManualDrive, TreeContextType } from "./types";

interface SidebarPanelProps {
  onClose: () => void;
  onTouchStart: (event: React.TouchEvent) => void;
  onTouchEnd: (event: React.TouchEvent) => void;
  drives: ManualDrive[];
  rootFolderId: string;
  treeContextValue: TreeContextType;
}

export default function SidebarPanel({
  onClose,
  onTouchStart,
  onTouchEnd,
  drives,
  rootFolderId,
  treeContextValue,
}: SidebarPanelProps) {
  const t = useTranslations("Sidebar");

  return (
    <div
      className="h-full flex flex-col bg-card/50 backdrop-blur-xl border-r border-border w-64"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className="p-4 border-b border-border flex items-center justify-between shrink-0 h-16">
        <h2 className="font-bold text-sm text-foreground tracking-wide flex items-center gap-2">
          {t("navigation")}
        </h2>
        <button
          onClick={onClose}
          className="lg:hidden p-1 hover:bg-accent rounded-md"
        >
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1 overscroll-contain no-scrollbar">
        <NavSection t={t} />
        <DriveList drives={drives} t={t} />

        <div
          className="border-t border-border my-2 pt-4"
          id="sidebar-explorer-tree"
        >
          <p className="px-3 text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wider">
            {t("explorer")}
          </p>
          <TreeContext.Provider value={treeContextValue}>
            <TreeNode id={rootFolderId} />
          </TreeContext.Provider>
        </div>
      </div>
    </div>
  );
}

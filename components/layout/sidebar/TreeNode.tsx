"use client";

import React, { memo } from "react";
import {
  ChevronRight,
  ChevronDown,
  Folder,
  File,
  Loader2,
  Lock,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import type { TreeContextType } from "./types";

export const TreeContext = React.createContext<TreeContextType | null>(null);

export const TreeNode = memo(
  ({ id, depth = 0 }: { id: string; depth?: number }) => {
    const currentFolderId = useAppStore((state) => state.currentFolderId);
    const currentFileId = useAppStore((state) => state.currentFileId);
    const navigatingId = useAppStore((state) => state.navigatingId);
    const context = React.useContext(TreeContext);

    if (!context) return null;

    const {
      tree,
      onToggle,
      onNavigate,
      onDrop,
      setDragOverFolderId,
      dragOverFolderId,
      canEdit,
    } = context;

    const node = tree[id];
    if (!node) return null;

    const isActuallyActive =
      navigatingId === id ||
      (currentFileId ? currentFileId === id : currentFolderId === id);

    const isDragOver = dragOverFolderId === id;

    return (
      <div className="relative">
        <div
          className={cn(
            "flex items-center gap-1.5 py-1.5 px-2 cursor-pointer hover:bg-accent/50 text-sm rounded-md transition-all select-none relative group my-0.5",
            isActuallyActive && "bg-accent text-accent-foreground font-medium",
            isDragOver && "bg-primary/20 scale-[1.02] ring-2 ring-primary/50",
            node.isLoading && "opacity-70",
          )}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onDragOver={(e) => {
            if (!canEdit) return;
            e.preventDefault();
            e.stopPropagation();
            setDragOverFolderId(node.id);
          }}
          onDragLeave={() => setDragOverFolderId(null)}
          onDrop={(e) => {
            if (!canEdit) return;
            onDrop(e, node.id);
          }}
          onClick={() => onNavigate(node.id)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onNavigate(node.id);
            } else if (
              e.key === "ArrowRight" &&
              node.isFolder &&
              !node.isExpanded
            ) {
              e.preventDefault();
              onToggle(node.id);
            } else if (
              e.key === "ArrowLeft" &&
              node.isFolder &&
              node.isExpanded
            ) {
              e.preventDefault();
              onToggle(node.id);
            }
          }}
          role="treeitem"
          aria-expanded={node.isFolder ? node.isExpanded : undefined}
          aria-selected={isActuallyActive}
          tabIndex={0}
        >
          {depth > 0 && (
            <div
              className="absolute left-0 top-0 bottom-0 border-l border-border/40 w-px"
              style={{ left: `${depth * 16 - 4}px` }}
            />
          )}

          <div
            onClick={(e) => {
              if (node.isFolder) {
                e.stopPropagation();
                onToggle(node.id);
              }
            }}
            className={cn(
              "p-1.5 -ml-1.5 rounded-sm transition-colors flex items-center justify-center shrink-0",
              node.isFolder
                ? "hover:bg-muted text-muted-foreground cursor-pointer group/chevron z-10"
                : "opacity-0 cursor-default",
            )}
          >
            {node.isFolder ? (
              node.isLoading ? (
                <Loader2 size={12} className="animate-spin" />
              ) : node.isExpanded ? (
                <ChevronDown size={12} />
              ) : (
                <ChevronRight size={12} />
              )
            ) : (
              <div className="w-3" />
            )}
          </div>
          <div className="relative shrink-0 flex items-center justify-center w-3.5 h-3.5">
            {navigatingId === node.id ? (
              <Loader2 size={14} className="animate-spin text-primary" />
            ) : (
              <>
                {node.isFolder ? (
                  <Folder
                    size={14}
                    className={cn(
                      "shrink-0 transition-colors",
                      isActuallyActive
                        ? "text-primary fill-primary/20"
                        : "text-muted-foreground group-hover:text-primary",
                    )}
                  />
                ) : (
                  <File
                    size={14}
                    className={cn(
                      "shrink-0 transition-colors",
                      isActuallyActive
                        ? "text-primary"
                        : "text-muted-foreground group-hover:text-primary",
                    )}
                  />
                )}
                {node.isProtected && (
                  <div className="absolute -bottom-0.5 -right-0.5 bg-background rounded-full p-0.5">
                    <Lock size={8} className="text-primary fill-primary/20" />
                  </div>
                )}
              </>
            )}
          </div>
          <span className="truncate text-[13px] leading-none pt-0.5 font-medium transition-colors">
            {node.name}
          </span>
        </div>

        {node.isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            transition={{ duration: 0.1, ease: "easeOut" }}
            className="overflow-hidden relative"
          >
            <div
              className="absolute top-0 bottom-2 border-l border-border/40"
              style={{ left: `${depth * 16 + 12 + 8}px` }}
            />
            {node.childIds.length > 0
              ? node.childIds.map((childId) => (
                  <TreeNode key={childId} id={childId} depth={depth + 1} />
                ))
              : null}
          </motion.div>
        )}
      </div>
    );
  },
);

TreeNode.displayName = "TreeNode";

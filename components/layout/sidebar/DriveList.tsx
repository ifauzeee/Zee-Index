"use client";

import React, { useState } from "react";
import {
  ChevronRight,
  ChevronDown,
  HardDrive,
  Loader2,
  Lock,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import type { ManualDrive } from "./types";

interface DriveListProps {
  drives: ManualDrive[];
  t: (key: string) => string;
}

export default function DriveList({ drives, t }: DriveListProps) {
  const router = useRouter();
  const currentFolderId = useAppStore((state) => state.currentFolderId);
  const navigatingId = useAppStore((state) => state.navigatingId);
  const setNavigatingId = useAppStore((state) => state.setNavigatingId);
  const setSidebarOpen = useAppStore((state) => state.setSidebarOpen);
  const [isDrivesExpanded, setIsDrivesExpanded] = useState(true);

  if (drives.length === 0) return null;

  return (
    <div className="mb-4 space-y-1 border-t border-border pt-4 mt-2">
      <button
        onClick={() => setIsDrivesExpanded(!isDrivesExpanded)}
        className="flex items-center justify-between w-full px-3 py-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors uppercase tracking-wider"
      >
        <span>{t("sharedDrives")}</span>
        {isDrivesExpanded ? (
          <ChevronDown size={14} />
        ) : (
          <ChevronRight size={14} />
        )}
      </button>

      <AnimatePresence>
        {isDrivesExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden space-y-0.5"
          >
            {drives.map((drive) => (
              <button
                key={drive.id}
                onClick={() => {
                  setNavigatingId(drive.id);
                  router.push(`/folder/${drive.id}`);
                  if (window.innerWidth < 1024) setSidebarOpen(false);
                }}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 text-sm rounded-md hover:bg-accent/50 transition-colors group",
                  currentFolderId === drive.id &&
                    "bg-accent font-medium text-primary",
                )}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  {navigatingId === drive.id ? (
                    <Loader2 size={14} className="animate-spin text-primary" />
                  ) : (
                    <HardDrive
                      size={14}
                      className={
                        currentFolderId === drive.id
                          ? "text-primary"
                          : "text-muted-foreground"
                      }
                    />
                  )}
                  <span className="truncate text-[13px]">{drive.name}</span>
                </div>
                {drive.isProtected && (
                  <Lock
                    size={10}
                    className="text-amber-500 shrink-0 opacity-70"
                  />
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

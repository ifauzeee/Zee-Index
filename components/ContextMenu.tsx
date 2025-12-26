"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  Pencil,
  Trash2,
  Share2,
  Move,
  Star,
  Copy,
  Info,
  Eye,
  Archive,
  Edit3,
  Pin,
  PinOff,
} from "lucide-react";
import { formatBytes, cn } from "@/lib/utils";
import React, { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onRename: () => void;
  onDelete: () => void;
  onShare: () => void;
  onMove: () => void;
  onToggleFavorite: () => void;
  isFavorite: boolean;
  onCopy: () => void;
  onShowDetails: () => void;
  onPreview: () => void;
  isArchive: boolean;
  onArchivePreview: () => void;
  isArchivePreviewable: boolean;
  isImage: boolean;
  onEditImage: () => void;
  isFolder: boolean;
  isPinned: boolean;
  onTogglePin: () => void;
  isAdmin: boolean;
}

export default function ContextMenu({
  x,
  y,
  onClose,
  onRename,
  onDelete,
  onShare,
  onMove,
  onToggleFavorite,
  isFavorite,
  onCopy,
  onShowDetails,
  onPreview,
  isArchive,
  onArchivePreview,
  isArchivePreviewable,
  isImage,
  onEditImage,
  isFolder,
  isPinned,
  onTogglePin,
  isAdmin,
}: ContextMenuProps) {
  const [isDesktop, setIsDesktop] = useState(false);
  const [mounted, setMounted] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: y, left: x });
  const t = useTranslations("ContextMenu");

  useEffect(() => {
    setMounted(true);
    const checkScreen = () => {
      setIsDesktop(window.innerWidth >= 768);
    };
    checkScreen();
    window.addEventListener("resize", checkScreen);
    return () => window.removeEventListener("resize", checkScreen);
  }, []);

  useEffect(() => {
    if (isDesktop && menuRef.current) {
      const { innerWidth, innerHeight } = window;
      const { offsetWidth, offsetHeight } = menuRef.current;

      let newLeft = x;
      let newTop = y;

      if (x + offsetWidth > innerWidth) {
        newLeft = x - offsetWidth;
      }

      if (y + offsetHeight > innerHeight) {
        newTop = y - offsetHeight;
      }

      setPosition({ top: newTop, left: newLeft });
    }
  }, [x, y, isDesktop]);

  const desktopStyle = isDesktop
    ? { top: position.top, left: position.left }
    : undefined;

  const MenuItem = ({
    onClick,
    icon: Icon,
    label,
    variant = "default",
    disabled = false,
    className = "",
  }: {
    onClick?: () => void;
    icon: React.ElementType;
    label: string | React.ReactNode;
    variant?: "default" | "danger" | "warning";
    disabled?: boolean;
    className?: string;
  }) => (
    <li>
      <button
        onClick={onClick}
        disabled={disabled}
        className={cn(
          "w-full text-left flex items-center gap-4 md:gap-2 px-6 md:px-4 py-4 md:py-2 text-base md:text-sm font-medium transition-colors active:bg-accent disabled:opacity-50 disabled:cursor-not-allowed select-none outline-none focus:outline-none focus:bg-accent/50",
          variant === "danger"
            ? "text-red-600 dark:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10"
            : variant === "warning"
              ? "text-yellow-600 dark:text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/10"
              : "text-foreground hover:bg-accent/50",
          className,
        )}
      >
        <Icon
          size={isDesktop ? 16 : 22}
          className={cn(
            "shrink-0",
            variant === "danger" ? "text-red-500" : "text-muted-foreground",
            variant === "warning" && "text-yellow-500",
          )}
        />
        {label}
      </button>
    </li>
  );

  const menuContent = (
    <ul className="py-2 md:py-1 space-y-0.5 md:space-y-0">
      {!isFolder && (
        <MenuItem onClick={onPreview} icon={Eye} label={t("preview")} />
      )}

      {isImage && isAdmin && (
        <MenuItem onClick={onEditImage} icon={Edit3} label={t("editImage")} />
      )}

      <MenuItem onClick={onShowDetails} icon={Info} label={t("viewDetails")} />

      {isArchive && (
        <MenuItem
          onClick={isArchivePreviewable ? onArchivePreview : undefined}
          disabled={!isArchivePreviewable}
          icon={Archive}
          label={
            !isArchivePreviewable
              ? t("archiveTooBig", {
                  size: formatBytes(ARCHIVE_PREVIEW_LIMIT_BYTES),
                })
              : t("viewArchive")
          }
        />
      )}

      {isFolder && isAdmin && (
        <>
          <li className="border-t my-2 border-border/50"></li>
          <MenuItem
            onClick={onTogglePin}
            icon={isPinned ? PinOff : Pin}
            label={isPinned ? t("unpin") : t("pinFolder")}
          />
        </>
      )}

      <li className="border-t my-2 border-border/50"></li>

      {isAdmin && (
        <MenuItem
          onClick={onToggleFavorite}
          icon={Star}
          variant={isFavorite ? "warning" : "default"}
          label={isFavorite ? t("removeFavorite") : t("addFavorite")}
        />
      )}

      {isAdmin && (
        <>
          <MenuItem onClick={onShare} icon={Share2} label={t("share")} />
          <MenuItem onClick={onCopy} icon={Copy} label={t("makeCopy")} />
          <MenuItem onClick={onMove} icon={Move} label={t("move")} />
          <MenuItem onClick={onRename} icon={Pencil} label={t("rename")} />

          <li className="border-t my-2 border-border/50"></li>

          <MenuItem
            onClick={onDelete}
            icon={Trash2}
            label={t("delete")}
            variant="danger"
          />
        </>
      )}
    </ul>
  );

  const content = (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[9999] select-none"
        onClick={onClose}
        onContextMenu={(e) => {
          e.preventDefault();
          onClose();
        }}
      >
        <motion.div
          ref={menuRef}
          className={cn(
            "bg-background/95 backdrop-blur-md border shadow-2xl z-[10000] overflow-hidden select-none",
            "fixed bottom-0 left-0 w-full rounded-t-3xl border-t pb-safe",
            "md:fixed md:w-64 md:rounded-xl md:border md:bottom-auto md:left-auto md:pb-0",
          )}
          style={desktopStyle}
          initial={isDesktop ? { opacity: 0, scale: 0.98 } : { y: "100%" }}
          animate={isDesktop ? { opacity: 1, scale: 1 } : { y: 0 }}
          exit={isDesktop ? { opacity: 0, scale: 0.98 } : { y: "100%" }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          onClick={(e) => e.stopPropagation()}
          onDoubleClick={(e) => e.preventDefault()}
        >
          <div
            className="flex md:hidden items-center justify-center pt-4 pb-2"
            onClick={onClose}
          >
            <div className="w-12 h-1.5 bg-muted-foreground/20 rounded-full" />
          </div>

          <div className="max-h-[80vh] overflow-y-auto overscroll-contain">
            {menuContent}
          </div>

          <div className="p-4 pt-2 mt-2 md:hidden bg-background">
            <button
              onClick={onClose}
              className="w-full py-3.5 bg-muted/50 text-foreground rounded-2xl font-semibold active:scale-95 transition-transform"
            >
              {t("cancel")}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );

  if (!mounted) return null;
  return createPortal(content, document.body);
}

const ARCHIVE_PREVIEW_LIMIT_BYTES = 100 * 1024 * 1024;

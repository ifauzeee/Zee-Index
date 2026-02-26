"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  Download,
  Share2,
  Eye,
  Trash2,
  Star,
  FolderOpen,
  Info,
  Copy,
  Move,
  ExternalLink,
} from "lucide-react";
import BottomSheet from "@/components/mobile/BottomSheet";
import { getIcon, formatBytes } from "@/lib/utils";
import type { DriveFile } from "@/lib/drive/types";
import { useTranslations } from "next-intl";

interface FileAction {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  variant?: "default" | "destructive";
  hidden?: boolean;
}

interface MobileFileActionsProps {
  file: DriveFile | null;
  isOpen: boolean;
  onClose: () => void;
  onDownload?: () => void;
  onShare?: () => void;
  onPreview?: () => void;
  onDelete?: () => void;
  onFavorite?: () => void;
  onOpenFolder?: () => void;
  onDetails?: () => void;
  onCopyLink?: () => void;
  onMove?: () => void;
  onOpenInDrive?: () => void;
  isFavorite?: boolean;
  isAdmin?: boolean;
}

export default function MobileFileActions({
  file,
  isOpen,
  onClose,
  onDownload,
  onShare,
  onPreview,
  onDelete,
  onFavorite,
  onOpenFolder,
  onDetails,
  onCopyLink,
  onMove,
  onOpenInDrive,
  isFavorite = false,
  isAdmin = false,
}: MobileFileActionsProps) {
  const t = useTranslations("FileActions");

  if (!file) return null;

  const IconComponent = getIcon(file.mimeType);

  const actions: FileAction[] = [
    {
      icon: Eye,
      label: t("preview"),
      onClick: () => {
        onPreview?.();
        onClose();
      },
    },
    {
      icon: Download,
      label: t("download"),
      onClick: () => {
        onDownload?.();
        onClose();
      },
      hidden: file.isFolder,
    },
    {
      icon: Share2,
      label: t("share"),
      onClick: () => {
        onShare?.();
        onClose();
      },
    },
    {
      icon: Star,
      label: isFavorite ? t("unfavorite") : t("favorite"),
      onClick: () => {
        onFavorite?.();
        onClose();
      },
    },
    {
      icon: Copy,
      label: t("copyLink"),
      onClick: () => {
        onCopyLink?.();
        onClose();
      },
    },
    {
      icon: FolderOpen,
      label: t("openFolder"),
      onClick: () => {
        onOpenFolder?.();
        onClose();
      },
      hidden: !file.parents?.length,
    },
    {
      icon: ExternalLink,
      label: t("openInDrive"),
      onClick: () => {
        onOpenInDrive?.();
        onClose();
      },
    },
    {
      icon: Info,
      label: t("details"),
      onClick: () => {
        onDetails?.();
        onClose();
      },
    },
    {
      icon: Move,
      label: t("move"),
      onClick: () => {
        onMove?.();
        onClose();
      },
      hidden: !isAdmin,
    },
    {
      icon: Trash2,
      label: t("delete"),
      onClick: () => {
        onDelete?.();
        onClose();
      },
      variant: "destructive" as const,
      hidden: !isAdmin,
    },
  ].filter((a) => !a.hidden);

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose}>
      {/* File info header */}
      <div className="flex items-center gap-3 pb-4 border-b border-border mb-3">
        <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
          <IconComponent size={24} className="text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm truncate">{file.name}</p>
          <p className="text-xs text-muted-foreground">
            {file.size ? formatBytes(parseInt(file.size)) : "Folder"}
            {file.modifiedTime &&
              ` • ${new Date(file.modifiedTime).toLocaleDateString()}`}
          </p>
        </div>
      </div>

      {/* Action list */}
      <div className="space-y-1">
        {actions.map((action, index) => (
          <motion.button
            key={action.label}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.03 }}
            onClick={action.onClick}
            className={`w-full flex items-center gap-4 px-3 py-3.5 rounded-xl transition-colors text-left ${
              action.variant === "destructive"
                ? "text-destructive hover:bg-destructive/10"
                : "hover:bg-accent text-foreground"
            }`}
          >
            <action.icon size={20} className="shrink-0" />
            <span className="text-sm font-medium">{action.label}</span>
          </motion.button>
        ))}
      </div>
    </BottomSheet>
  );
}

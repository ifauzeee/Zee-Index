"use client";

import { motion, AnimatePresence } from "framer-motion";
import { FolderPlus, UploadCloud, FolderUp } from "lucide-react";
import React, { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

interface EmptyAreaContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onNewFolder: () => void;
  onUploadFiles: () => void;
  onUploadFolder: () => void;
}

export default function EmptyAreaContextMenu({
  x,
  y,
  onClose,
  onNewFolder,
  onUploadFiles,
  onUploadFolder,
}: EmptyAreaContextMenuProps) {
  const [isDesktop, setIsDesktop] = useState(false);
  const [mounted, setMounted] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: y, left: x });
  const t = useTranslations("EmptyContextMenu");

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
    className = "",
  }: {
    onClick: () => void;
    icon: React.ElementType;
    label: string;
    className?: string;
  }) => (
    <li>
      <button
        onClick={onClick}
        className={cn(
          "w-full text-left flex items-center gap-4 md:gap-2 px-6 md:px-4 py-4 md:py-2 text-base md:text-sm font-medium transition-colors active:bg-accent select-none outline-none focus:outline-none focus:bg-accent/50 text-foreground hover:bg-accent/50",
          className,
        )}
      >
        <Icon
          size={isDesktop ? 16 : 22}
          className="shrink-0 text-muted-foreground"
        />
        {label}
      </button>
    </li>
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

          <ul className="py-2 md:py-1 space-y-0.5 md:space-y-0">
            <MenuItem
              onClick={onNewFolder}
              icon={FolderPlus}
              label={t("newFolder")}
            />
            <MenuItem
              onClick={onUploadFiles}
              icon={UploadCloud}
              label={t("uploadFiles")}
            />
            <MenuItem
              onClick={onUploadFolder}
              icon={FolderUp}
              label={t("uploadFolder")}
            />
          </ul>

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

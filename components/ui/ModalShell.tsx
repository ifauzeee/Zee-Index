"use client";

import React from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModalShellProps {
  onClose: () => void;
  className?: string;
  showCloseButton?: boolean;
  title?: React.ReactNode;
  variant?: "default" | "slideUp";
  children: React.ReactNode;
}

export default function ModalShell({
  onClose,
  className,
  showCloseButton = true,
  title,
  variant = "default",
  children,
}: ModalShellProps) {
  const isSlideUp = variant === "slideUp";

  return (
    <motion.div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={isSlideUp ? { opacity: 0 } : undefined}
      onClick={onClose}
    >
      <motion.div
        className={cn(
          "relative w-full max-w-md bg-background p-6 rounded-lg shadow-xl",
          className,
        )}
        initial={isSlideUp ? { scale: 0.9, y: 20 } : { scale: 0.9 }}
        animate={isSlideUp ? { scale: 1, y: 0 } : { scale: 1 }}
        exit={isSlideUp ? { scale: 0.9, y: 20 } : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        {showCloseButton && (
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-muted-foreground hover:text-foreground z-10"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        )}
        {title != null && (
          <h3 className="text-lg font-semibold mb-4 pr-8">{title}</h3>
        )}
        {children}
      </motion.div>
    </motion.div>
  );
}

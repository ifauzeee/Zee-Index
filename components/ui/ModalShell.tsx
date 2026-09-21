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
  children: React.ReactNode;
}

export default function ModalShell({
  onClose,
  className,
  showCloseButton = true,
  title,
  children,
}: ModalShellProps) {
  return (
    <motion.div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      onClick={onClose}
    >
      <motion.div
        className={cn(
          "relative w-full max-w-md bg-background p-6 rounded-lg shadow-xl",
          className,
        )}
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
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

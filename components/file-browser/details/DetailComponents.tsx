"use client";

import React, { useState } from "react";
import { motion, Variants } from "framer-motion";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

export const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 20,
    },
  },
};

export const contentVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

export function QuickStat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
}) {
  return (
    <motion.div
      variants={itemVariants}
      className="relative flex flex-col gap-1.5 p-4 rounded-2xl bg-secondary/30 border border-border/50 overflow-hidden group hover:bg-secondary/50 transition-colors"
    >
      <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all duration-500">
        <Icon size={48} />
      </div>
      <div className="flex items-center gap-2 text-muted-foreground z-10">
        <Icon size={14} strokeWidth={2.5} />
        <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">
          {label}
        </span>
      </div>
      <span className="text-sm font-semibold truncate z-10 text-foreground">
        {value}
      </span>
    </motion.div>
  );
}

export function DetailRow({
  icon: Icon,
  label,
  value,
  copyable = false,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  copyable?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const t = useTranslations("DetailsPanel");

  const handleCopy = () => {
    if (!copyable) return;
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      variants={itemVariants}
      onClick={handleCopy}
      className={cn(
        "flex items-center justify-between py-3 px-2 border-b border-border/40 last:border-0 group rounded-lg transition-colors",
        copyable && "cursor-pointer hover:bg-muted/40",
      )}
    >
      <div className="flex items-center gap-3 text-muted-foreground">
        <div className="p-2 rounded-lg bg-secondary/50 group-hover:bg-background transition-colors">
          <Icon size={16} />
        </div>
        <span className="text-sm font-medium">{label}</span>
      </div>
      <span
        className={cn(
          "text-sm font-medium text-right break-all max-w-[55%]",
          copied ? "text-green-500" : "text-foreground/90",
        )}
      >
        {copied ? t("copied") : value}
      </span>
    </motion.div>
  );
}

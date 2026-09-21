"use client";

import React from "react";
import {
  RefreshCw,
  Settings,
  ShieldAlert,
  ArrowRight,
  Database,
} from "lucide-react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { useRouter, usePathname } from "next/navigation";

interface SetupRequiredProps {
  message?: string;
  type?: "expired" | "config";
}

export default function SetupRequired({
  message,
  type = "expired",
}: SetupRequiredProps) {
  const t = useTranslations("SetupRequired");
  const isExpired = type === "expired";
  const router = useRouter();
  const pathname = usePathname();
  const openSetupPage = () => {
    const locale = pathname.match(/^\/(en|id)(\/|$)/)?.[1];
    router.push(`${locale ? `/${locale}` : ""}/setup`);
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: "easeOut",
        staggerChildren: 0.08,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 8 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, ease: "easeOut" },
    },
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] w-full px-6 bg-background rounded-3xl">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex flex-col items-center w-full max-w-[400px]"
      >
        {/* Icon Container with absolute centering */}
        <motion.div variants={itemVariants} className="mb-6 relative">
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-muted/50 border border-border/50">
            {isExpired ? (
              <ShieldAlert
                className="w-7 h-7 text-muted-foreground/80"
                strokeWidth={1.5}
              />
            ) : (
              <Database
                className="w-7 h-7 text-muted-foreground/80"
                strokeWidth={1.5}
              />
            )}
          </div>
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="text-center space-y-2 mb-8"
        >
          <h2 className="text-xl font-bold text-foreground">
            {isExpired ? t("expiredTitle") : t("configTitle")}
          </h2>
          <p className="text-[13px] text-muted-foreground leading-relaxed px-2">
            {message || t("defaultMessage")}
          </p>
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="flex flex-col w-full gap-2.5"
        >
          <button
            onClick={openSetupPage}
            className="group flex items-center justify-center gap-2 h-11 px-6 bg-foreground text-background hover:opacity-90 text-[13px] font-semibold rounded-xl transition-all"
          >
            <Settings
              size={15}
              className="group-hover:rotate-45 transition-transform"
            />
            <span>{t("openSetup")}</span>
            <ArrowRight size={15} />
          </button>

          <button
            onClick={() => window.location.reload()}
            className="flex items-center justify-center gap-2 h-11 px-6 bg-transparent hover:bg-secondary/50 text-foreground border border-border text-[13px] font-medium rounded-xl transition-colors"
          >
            <RefreshCw size={14} />
            <span>{t("tryAgain")}</span>
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
}

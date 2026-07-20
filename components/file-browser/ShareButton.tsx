"use client";

import { useState, useEffect } from "react";
import { Share2, X, Copy, Clock, Zap } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { motion, AnimatePresence } from "framer-motion";
import type { DriveFile } from "@/lib/drive";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { SecurityPolicies, DurationSettings } from "./share/ShareModalContent";

interface ShareButtonProps {
  path?: string;
  itemName?: string;
  items?: DriveFile[];
  isOpen?: boolean;
  onClose?: () => void;
}

type TimeUnit = "s" | "m" | "h" | "d";

export default function ShareButton({
  path,
  itemName,
  items,
  isOpen: controlledIsOpen,
  onClose,
}: ShareButtonProps) {
  const t = useTranslations("ShareButton");
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const { addToast, user, addShareLink } = useAppStore();

  const [customDuration, setCustomDuration] = useState<string | number>(10);
  const [customUnit, setCustomUnit] = useState<TimeUnit>("m");
  const [loginRequired, setLoginRequired] = useState(false);
  const [preventDownload, setPreventDownload] = useState(false);
  const [hasWatermark, setHasWatermark] = useState(false);
  const [watermarkText, setWatermarkText] = useState("");
  const [useMaxUses, setUseMaxUses] = useState(false);
  const [maxUses, setMaxUses] = useState<string | number>(1);
  const [directDownload, setDirectDownload] = useState(false);
  const [activeTab, setActiveTab] = useState<"timed" | "session">("timed");
  const [isGenerating, setIsGenerating] = useState(false);

  const isOpen = controlledIsOpen ?? internalIsOpen;

  useEffect(() => {
    if (controlledIsOpen && user && user.role !== "ADMIN") {
      addToast({ message: t("adminOnly"), type: "error" });
      if (onClose) onClose();
    }
  }, [controlledIsOpen, user, addToast, onClose, t]);

  const handleOpen = () => {
    if (user?.role !== "ADMIN") {
      addToast({ message: t("adminOnly"), type: "error" });
      return;
    }
    setInternalIsOpen(true);
  };

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      setInternalIsOpen(false);
    }
  };

  const generateLink = async (type: "timed" | "session") => {
    setIsGenerating(true);
    try {
      const durationValue =
        typeof customDuration === "string"
          ? parseInt(customDuration, 10) || 1
          : customDuration;
      const finalDuration = Math.max(1, durationValue);
      const expiresIn =
        type === "timed" ? `${finalDuration}${customUnit}` : "365d";

      const isCollection = items && items.length > 0;
      const sharePath = isCollection ? null : path;
      const shareName = isCollection
        ? t("shareCollection", { count: items.length })
        : itemName;
      const shareItems = isCollection ? items : undefined;

      const response = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: sharePath,
          itemName: shareName,
          type,
          expiresIn,
          loginRequired,
          items: shareItems,
          preventDownload,
          directDownload,
          hasWatermark,
          watermarkText: hasWatermark ? watermarkText : null,
          maxUses: useMaxUses
            ? typeof maxUses === "string"
              ? parseInt(maxUses, 10) || null
              : maxUses
            : null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || t("createError"));
      }

      const { shareableUrl, newShareLink } = await response.json();
      addShareLink(newShareLink);

      await navigator.clipboard.writeText(shareableUrl);
      addToast({ message: t("linkCopied"), type: "success" });
      handleClose();
    } catch (error) {
      addToast({ message: (error as Error).message, type: "error" });
    } finally {
      setIsGenerating(false);
    }
  };

  if (controlledIsOpen && user && user.role !== "ADMIN") {
    return null;
  }

  const ModalContent = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
        >
          <motion.div
            className="relative w-full max-w-lg bg-background rounded-lg shadow-xl"
            initial={{ scale: 0.95, y: 10 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 10 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-2">
              <div>
                <h3 className="text-lg font-semibold">{t("share")}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {itemName ||
                    (items?.length
                      ? t("shareCollection", { count: items.length })
                      : "")}
                </p>
              </div>
              <button
                onClick={handleClose}
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Tab picker */}
            <div className="px-6 py-3">
              <div className="flex bg-accent rounded-lg p-0.5">
                <button
                  onClick={() => setActiveTab("timed")}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm rounded-md transition-all",
                    activeTab === "timed"
                      ? "bg-background shadow-sm font-medium text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Clock size={14} />
                  {t("timedLink")}
                </button>
                <button
                  onClick={() => setActiveTab("session")}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm rounded-md transition-all",
                    activeTab === "session"
                      ? "bg-background shadow-sm font-medium text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Zap size={14} />
                  {t("sessionLink")}
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="px-6 pb-4 space-y-5">
              {activeTab === "timed" && (
                <DurationSettings
                  customDuration={customDuration}
                  setCustomDuration={setCustomDuration}
                  customUnit={customUnit}
                  setCustomUnit={setCustomUnit}
                  t={t}
                />
              )}

              <SecurityPolicies
                loginRequired={loginRequired}
                setLoginRequired={setLoginRequired}
                preventDownload={preventDownload}
                setPreventDownload={setPreventDownload}
                directDownload={directDownload}
                setDirectDownload={setDirectDownload}
                hasWatermark={hasWatermark}
                setHasWatermark={setHasWatermark}
                watermarkText={watermarkText}
                setWatermarkText={setWatermarkText}
                useMaxUses={useMaxUses}
                setUseMaxUses={setUseMaxUses}
                maxUses={maxUses}
                setMaxUses={setMaxUses}
                t={t}
              />
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border/50">
              <button
                onClick={handleClose}
                className="px-4 py-2 text-sm rounded-md hover:bg-accent transition-colors text-muted-foreground"
              >
                {t("cancel")}
              </button>
              <button
                onClick={() => generateLink(activeTab)}
                disabled={isGenerating}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                <Copy size={15} />
                {isGenerating
                  ? t("creating")
                  : activeTab === "timed"
                    ? t("copyTimed")
                    : t("copySession")}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (controlledIsOpen !== undefined) {
    return ModalContent;
  }

  return (
    <>
      <button
        onClick={handleOpen}
        className="p-2 rounded-lg hover:bg-accent flex items-center justify-center text-sm gap-2 text-foreground"
        title={t("tooltip")}
      >
        <Share2 size={18} />
      </button>
      {ModalContent}
    </>
  );
}

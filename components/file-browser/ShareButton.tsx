"use client";

import { useState, useEffect } from "react";
import { Share2, X, Copy } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { motion, AnimatePresence } from "framer-motion";
import type { DriveFile } from "@/lib/drive";
import { useTranslations } from "next-intl";
import {
  ShareSidebar,
  SecurityPolicies,
  DurationSettings,
} from "./share/ShareModalContent";

interface ShareButtonProps {
  path?: string;
  itemName?: string;
  items?: DriveFile[];
  isOpen?: boolean;
  onClose?: () => void;
}

type TimeUnit = "s" | "m" | "h" | "d";

const modalVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
};

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

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
  const [activeTab, setActiveTab] = useState<"timed" | "session">("timed");

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
    }
  };

  if (controlledIsOpen && user && user.role !== "ADMIN") {
    return null;
  }

  const ModalContent = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 sm:p-6"
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={overlayVariants}
          onClick={handleClose}
        >
          <motion.div
            className="relative w-full max-w-4xl bg-background/95 border border-border/50 backdrop-blur-md rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row h-auto max-h-[90vh]"
            variants={modalVariants}
            onClick={(e) => e.stopPropagation()}
          >
            <ShareSidebar
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              itemName={itemName}
              itemCount={items?.length}
              t={t}
            />

            <div className="flex-1 flex flex-col h-full max-h-[70vh] md:max-h-none overflow-y-auto scrollbar-hide">
              <div className="p-6 sm:p-8 space-y-8 flex-grow">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight">
                      {activeTab === "timed"
                        ? t("timedLink")
                        : t("sessionLink")}
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      {activeTab === "timed"
                        ? t("timedLinkDesc")
                        : t("sessionLinkDesc")}
                    </p>
                  </div>
                  <button
                    onClick={handleClose}
                    className="p-2 hover:bg-accent rounded-full transition-colors"
                  >
                    <X size={20} className="text-muted-foreground" />
                  </button>
                </div>

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

              <div className="p-6 sm:p-8 bg-accent/20 border-t border-border/50 flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="text-[11px] text-muted-foreground text-center sm:text-left">
                  Confirm all settings before generating the public link.
                </div>
                <button
                  onClick={() => generateLink(activeTab)}
                  className="w-full sm:w-auto min-w-[200px] flex items-center justify-center gap-3 px-8 py-4 bg-primary text-primary-foreground rounded-2xl font-bold shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
                >
                  <Copy size={20} />
                  {activeTab === "timed" ? t("copyTimed") : t("copySession")}
                </button>
              </div>
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

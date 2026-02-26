"use client";

import { useState, useEffect } from "react";
import { Share2, X, Clock, Zap, Copy, ShieldCheck } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import type { DriveFile } from "@/lib/drive";
import { useTranslations } from "next-intl";

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
  const [useMaxUses, setUseMaxUses] = useState(false);
  const [maxUses, setMaxUses] = useState<string | number>(1);

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

  const isCollection = items && items.length > 0;
  const title = isCollection
    ? t("shareCollection", { count: items.length })
    : t("shareItem", { itemName: itemName || "" });

  const [activeTab, setActiveTab] = useState<"timed" | "session">("timed");

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
            {/* Sidebar / Left Column */}
            <div className="w-full md:w-80 bg-accent/30 border-b md:border-b-0 md:border-r border-border/50 p-6 flex flex-col">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-2.5 bg-primary/10 rounded-xl">
                  <Share2 className="text-primary w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold leading-none">
                    {t("share")}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">
                    {itemName ||
                      (items ? `${items.length} items` : "Collection")}
                  </p>
                </div>
              </div>

              <div className="space-y-2 flex-grow">
                <button
                  onClick={() => setActiveTab("timed")}
                  className={cn(
                    "w-full flex items-center gap-3 p-3.5 rounded-xl transition-all duration-200 group text-left",
                    activeTab === "timed"
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                      : "hover:bg-accent/50 text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Clock
                    size={20}
                    className={cn(
                      "transition-transform group-hover:scale-110",
                      activeTab === "timed"
                        ? "text-primary-foreground"
                        : "text-primary",
                    )}
                  />
                  <div className="flex flex-col">
                    <span className="font-semibold text-sm">
                      {t("timedLink")}
                    </span>
                    <span className="text-[10px] opacity-70">
                      Temporary access
                    </span>
                  </div>
                </button>

                <button
                  onClick={() => setActiveTab("session")}
                  className={cn(
                    "w-full flex items-center gap-3 p-3.5 rounded-xl transition-all duration-200 group text-left",
                    activeTab === "session"
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                      : "hover:bg-accent/50 text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Zap
                    size={20}
                    className={cn(
                      "transition-transform group-hover:scale-110",
                      activeTab === "session"
                        ? "text-primary-foreground"
                        : "text-amber-400",
                    )}
                  />
                  <div className="flex flex-col">
                    <span className="font-semibold text-sm">
                      {t("sessionLink")}
                    </span>
                    <span className="text-[10px] opacity-70">
                      Long-term access
                    </span>
                  </div>
                </button>
              </div>

              <div className="mt-8 pt-6 border-t border-border/50 text-[11px] text-muted-foreground leading-relaxed">
                By generating a link, you agree to track and monitor the link
                usage in the Admin Panel.
              </div>
            </div>

            {/* Main Content Area */}
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

                {/* Specific Config for Timed Link */}
                {activeTab === "timed" && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-5 bg-accent/20 rounded-2xl border border-border/50"
                  >
                    <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      Duration Settings
                    </h4>
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <input
                          type="number"
                          value={customDuration}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            setCustomDuration(isNaN(val) ? "" : val);
                          }}
                          className="w-full px-4 py-2.5 rounded-xl border-2 border-transparent bg-background/50 focus:border-primary/50 focus:ring-0 transition-all outline-none"
                          min="1"
                        />
                      </div>
                      <div className="flex-[2]">
                        <select
                          value={customUnit}
                          onChange={(e) =>
                            setCustomUnit(e.target.value as TimeUnit)
                          }
                          className="w-full px-4 py-2.5 rounded-xl border-2 border-transparent bg-background/50 focus:border-primary/50 focus:ring-0 transition-all outline-none"
                        >
                          <option value="s">{t("seconds")}</option>
                          <option value="m">{t("minutes")}</option>
                          <option value="h">{t("hours")}</option>
                          <option value="d">{t("days")}</option>
                        </select>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Security & Access Section */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground/70 px-1">
                    Security & Policies
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      onClick={() => setLoginRequired(!loginRequired)}
                      className={cn(
                        "flex items-center gap-3 p-4 rounded-2xl border text-left transition-all duration-200",
                        loginRequired
                          ? "bg-primary/5 border-primary shadow-sm"
                          : "bg-background hover:border-border/80 hover:bg-accent/20",
                      )}
                    >
                      <ShieldCheck
                        className={cn(
                          "w-5 h-5",
                          loginRequired
                            ? "text-primary"
                            : "text-muted-foreground",
                        )}
                      />
                      <div className="flex-1">
                        <p className="text-sm font-semibold">
                          {t("requireLogin")}
                        </p>
                        <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                          Protect with account
                        </p>
                      </div>
                    </button>

                    <button
                      onClick={() => setPreventDownload(!preventDownload)}
                      className={cn(
                        "flex items-center gap-3 p-4 rounded-2xl border text-left transition-all duration-200",
                        preventDownload
                          ? "bg-primary/5 border-primary shadow-sm"
                          : "bg-background hover:border-border/80 hover:bg-accent/20",
                      )}
                    >
                      <ShieldCheck
                        className={cn(
                          "w-5 h-5",
                          preventDownload
                            ? "text-primary"
                            : "text-muted-foreground",
                        )}
                      />
                      <div className="flex-1">
                        <p className="text-sm font-semibold">
                          {t("preventDownload")}
                        </p>
                        <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                          Restrict direct saving
                        </p>
                      </div>
                    </button>

                    <button
                      onClick={() => setHasWatermark(!hasWatermark)}
                      className={cn(
                        "flex items-center gap-3 p-4 rounded-2xl border text-left transition-all duration-200",
                        hasWatermark
                          ? "bg-primary/5 border-primary shadow-sm"
                          : "bg-background hover:border-border/80 hover:bg-accent/20",
                      )}
                    >
                      <ShieldCheck
                        className={cn(
                          "w-5 h-5",
                          hasWatermark
                            ? "text-primary"
                            : "text-muted-foreground",
                        )}
                      />
                      <div className="flex-1">
                        <p className="text-sm font-semibold">
                          {t("hasWatermark")}
                        </p>
                        <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                          Enable visual protection
                        </p>
                      </div>
                    </button>

                    <div
                      className={cn(
                        "flex flex-col gap-2 p-4 rounded-2xl border transition-all duration-200",
                        useMaxUses
                          ? "bg-primary/5 border-primary shadow-sm"
                          : "bg-background",
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <ShieldCheck
                            className={cn(
                              "w-5 h-5",
                              useMaxUses
                                ? "text-primary"
                                : "text-muted-foreground",
                            )}
                          />
                          <div className="flex flex-col">
                            <p className="text-sm font-semibold">
                              {t("limitAccess")}
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis">
                              Max views/downloads
                            </p>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={useMaxUses}
                          onChange={(e) => setUseMaxUses(e.target.checked)}
                          className="h-4 w-4 rounded-full border-gray-300 text-primary focus:ring-primary cursor-pointer"
                        />
                      </div>
                      {useMaxUses && (
                        <motion.input
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          type="number"
                          value={maxUses}
                          autoFocus
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            setMaxUses(isNaN(val) ? "" : val);
                          }}
                          className="w-full mt-1.5 px-3 py-1.5 rounded-lg border-2 border-primary/20 bg-background text-sm outline-none focus:border-primary/50"
                          min="1"
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Bar */}
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

"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/lib/store";
import {
  Bell,
  Check,
  X,
  Trash2,
  Info,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { useScrollLock } from "@/hooks/useScrollLock";
import { format } from "date-fns";
import * as locales from "date-fns/locale";
import { useTranslations, useLocale } from "next-intl";

export default function NotificationCenter() {
  const {
    notifications,
    isNotificationOpen,
    toggleNotificationCenter,
    markAllNotificationsRead,
    clearNotifications,
  } = useAppStore();

  const t = useTranslations("NotificationCenter");
  const locale = useLocale();
  const dateLocale = locale === "id" ? locales.id : locales.enUS;

  const iconMap = {
    success: <CheckCircle2 className="text-green-500" size={18} />,
    error: <XCircle className="text-red-500" size={18} />,
    info: <Info className="text-blue-500" size={18} />,
  };

  useScrollLock(isNotificationOpen);

  return (
    <AnimatePresence>
      {isNotificationOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={toggleNotificationCenter}
            className="fixed inset-0 z-[9998] bg-black/50"
          />

          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", ease: "easeInOut", duration: 0.3 }}
            className="fixed top-0 right-0 h-full w-full sm:w-96 bg-background border-l border-border shadow-2xl z-[9999] flex flex-col"
          >
            <div className="p-4 border-b border-border flex items-center justify-between bg-muted/10">
              <div className="flex items-center gap-2">
                <Bell className="text-primary" size={20} />
                <h2 className="font-bold text-lg">{t("notifications")}</h2>
                <span className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full font-bold">
                  {notifications.length}
                </span>
              </div>
              <button
                onClick={toggleNotificationCenter}
                className="p-2 hover:bg-accent rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground opacity-50">
                  <Bell size={48} className="mb-4" />
                  <p>{t("noNotifications")}</p>
                </div>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`p-4 rounded-lg border border-border bg-card relative ${
                      !notif.read
                        ? "bg-accent/10 border-l-4 border-l-primary"
                        : ""
                    }`}
                  >
                    <div className="flex gap-3 items-start">
                      <div className="mt-0.5">{iconMap[notif.type]}</div>
                      <div className="flex-1">
                        <p className="text-sm text-foreground leading-relaxed">
                          {notif.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {format(notif.timestamp, "dd MMM HH:mm", {
                            locale: dateLocale,
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {notifications.length > 0 && (
              <div className="p-4 border-t border-border bg-muted/10 flex gap-2">
                <button
                  onClick={markAllNotificationsRead}
                  className="flex-1 py-2 px-4 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                >
                  <Check size={16} /> {t("markAsRead")}
                </button>
                <button
                  onClick={clearNotifications}
                  className="flex-1 py-2 px-4 rounded-lg border border-destructive/20 text-destructive hover:bg-destructive/10 text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                >
                  <Trash2 size={16} /> {t("clearAll")}
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

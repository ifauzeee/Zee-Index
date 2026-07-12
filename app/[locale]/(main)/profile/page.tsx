"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { motion } from "framer-motion";
import { LogIn, KeyRound, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import EmptyState from "@/components/file-browser/EmptyState";

export default function ProfilePage() {
  const router = useRouter();
  const { user, addToast } = useAppStore();
  const t = useTranslations("ProfilePage");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  if (user?.isGuest || !user) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-xl font-bold mb-4">{t("title")}</h1>
        <div className="text-center py-20 text-muted-foreground">
          <EmptyState
            icon={LogIn}
            title={t("requiresLogin")}
            message={t("requiresLogin")}
          />
        </div>
      </motion.div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) return;
    setIsSubmitting(true);
    setMessage(null);
    try {
      const res = await fetch("/api/auth/profile/password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (res.ok) {
        setMessage({ type: "success", text: t("success") });
        setCurrentPassword("");
        setNewPassword("");
      } else {
        const data = await res.json().catch(() => ({}));
        setMessage({
          type: "error",
          text:
            res.status === 400 && data.error?.includes("incorrect")
              ? t("incorrect")
              : t("error"),
        });
      }
    } catch {
      setMessage({ type: "error", text: t("error") });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="max-w-xl"
    >
      <h1 className="text-xl font-bold mb-4">{t("title")}</h1>
      <div className="bg-card border rounded-xl shadow-sm p-6 space-y-4">
        <div className="flex items-center gap-3">
          <KeyRound className="h-8 w-8 text-muted-foreground" />
          <div>
            <p className="font-semibold">{t("submit")}</p>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder={t("currentPassword")}
            required
            className="w-full px-4 py-2.5 rounded-lg border bg-background focus:ring-2 focus:ring-primary focus:outline-none"
          />
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder={t("newPassword")}
            required
            minLength={6}
            className="w-full px-4 py-2.5 rounded-lg border bg-background focus:ring-2 focus:ring-primary focus:outline-none"
          />
          {message && (
            <p
              className={
                message.type === "success"
                  ? "text-sm text-green-600"
                  : "text-sm text-red-600"
              }
            >
              {message.text}
            </p>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <KeyRound size={18} />
            )}
            <span>{t("submit")}</span>
          </button>
        </form>
      </div>
    </motion.div>
  );
}

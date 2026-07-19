"use client";

import React, { useState, useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { motion } from "framer-motion";
import {
  User,
  LogIn,
  KeyRound,
  Loader2,
  Shield,
  Mail,
  UserCircle,
  Info,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import Loading from "@/components/common/Loading";
import EmptyState from "@/components/file-browser/EmptyState";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.07 },
  },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

export default function ProfilePage() {
  const { user, fetchUser } = useAppStore();
  const { status } = useSession();
  const t = useTranslations("ProfilePage");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    if (status === "authenticated" && !user) {
      fetchUser();
    }
  }, [status, fetchUser, user]);

  if (status === "loading" || (status === "authenticated" && !user)) {
    return <Loading />;
  }

  if (!user || user.isGuest || status === "unauthenticated") {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="py-6"
      >
        <h1 className="text-2xl font-bold mb-8">{t("title")}</h1>
        <EmptyState
          icon={LogIn}
          title={t("title")}
          message={t("requiresLogin")}
        />
      </motion.div>
    );
  }

  const initials = user.name
    ? user.name.charAt(0).toUpperCase()
    : user.email?.charAt(0).toUpperCase() || "U";

  const details = [
    { label: t("email"), value: user.email || "—", icon: Mail },
    { label: t("role"), value: user.role || "—", icon: Shield },
  ];

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
      variants={container}
      initial="hidden"
      animate="show"
      className="py-6 space-y-8"
    >
      {/* ── Header ── */}
      <motion.div variants={item}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 text-primary rounded-2xl shadow-sm">
              <User size={26} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {t("title")}
              </h1>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>
          {user.role && (
            <span className="hidden sm:inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-primary/10 text-primary capitalize tracking-wide">
              {user.role.toLowerCase()}
            </span>
          )}
        </div>
      </motion.div>

      {/* ── Profile Info ── */}
      <motion.div variants={item}>
        <div className="bg-card border rounded-2xl overflow-hidden shadow-sm">
          <div className="p-5 border-b bg-muted/30">
            <h2 className="font-semibold flex items-center gap-2 text-sm">
              <UserCircle size={16} className="text-muted-foreground" />
              {t("profileInfo")}
            </h2>
          </div>
          <div className="p-6">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xl font-bold shrink-0 ring-2 ring-primary/20">
                {initials}
              </div>
              <div>
                <h3 className="text-lg font-bold">
                  {user.name || user.email?.split("@")[0] || "User"}
                </h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {user.email}
                </p>
                {user.role && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary capitalize tracking-wide mt-2">
                    {user.role.toLowerCase()}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Account Details ── */}
      <motion.div variants={item}>
        <div className="bg-card border rounded-2xl overflow-hidden shadow-sm">
          <div className="p-5 border-b bg-muted/30">
            <h2 className="font-semibold flex items-center gap-2 text-sm">
              <Info size={16} className="text-muted-foreground" />
              {t("details")}
            </h2>
          </div>
          <div className="divide-y">
            {details.map((detail) => (
              <div
                key={detail.label}
                className="flex items-center justify-between px-5 py-3.5 hover:bg-muted/20 transition-colors"
              >
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <detail.icon size={14} className="text-muted-foreground/60" />
                  {detail.label}
                </span>
                <span className="text-sm font-medium">{detail.value}</span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ── Password & Security ── */}
      <motion.div variants={item}>
        <div className="bg-card border rounded-2xl overflow-hidden shadow-sm">
          <div className="p-5 border-b bg-muted/30">
            <h2 className="font-semibold flex items-center gap-2 text-sm">
              <Shield size={16} className="text-muted-foreground" />
              {t("passwordSecurity")}
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-5">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider ml-1">
                  {t("currentPassword")}
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder={t("currentPassword")}
                    required
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border bg-background/50 focus:bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-muted-foreground/30 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider ml-1">
                  {t("newPassword")}
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder={t("newPassword")}
                    required
                    minLength={6}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border bg-background/50 focus:bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-muted-foreground/30 text-sm"
                  />
                </div>
              </div>
            </div>

            {message && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium ${
                  message.type === "success"
                    ? "bg-green-500/10 text-green-600 dark:text-green-400"
                    : "bg-red-500/10 text-red-600 dark:text-red-400"
                }`}
              >
                {message.type === "success" ? (
                  <CheckCircle2 size={16} className="shrink-0" />
                ) : (
                  <AlertCircle size={16} className="shrink-0" />
                )}
                <span>{message.text}</span>
              </motion.div>
            )}

            <div className="flex items-center gap-3 pt-1">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-all font-medium disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] text-sm"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin" size={16} />
                    <span>...</span>
                  </>
                ) : (
                  <>
                    <KeyRound size={16} />
                    <span>{t("submit")}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </motion.div>
  );
}

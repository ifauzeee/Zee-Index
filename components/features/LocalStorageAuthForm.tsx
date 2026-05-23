"use client";

import { useState } from "react";
import {
  Loader2,
  Lock,
  ArrowRight,
  HardDrive,
  ShieldAlert,
} from "lucide-react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";

interface LocalStorageAuthFormProps {
  isLoading: boolean;
  onSubmit: (password: string) => Promise<boolean>;
}

export default function LocalStorageAuthForm({
  isLoading,
  onSubmit,
}: LocalStorageAuthFormProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const t = useTranslations("AuthForm");
  const tBrowser = useTranslations("FileBrowser");
  const tSidebar = useTranslations("Sidebar");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!password) return;

    const success = await onSubmit(password);
    if (!success) {
      setError(
        tBrowser("wrongCredentials") ||
          t("loginFailedText") ||
          "Password salah",
      );
    }
  };

  return (
    <div className="w-full max-w-5xl flex flex-col md:flex-row items-center justify-center gap-12 md:gap-24 p-6">
      <motion.div
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="flex-1 flex flex-col items-center md:items-end text-center md:text-right"
      >
        <div className="p-6 bg-primary/10 rounded-full mb-6 ring-1 ring-primary/20">
          <HardDrive size={64} className="text-primary/70" strokeWidth={1.5} />
        </div>

        <h3 className="text-3xl font-bold text-foreground tracking-tight">
          {t("accessRestricted")}
        </h3>

        <p className="text-muted-foreground mt-4 leading-relaxed max-w-[280px] text-base">
          <span className="block mb-2 font-semibold text-primary">
            {tSidebar("localCloud") || "Penyimpanan Lokal"}
          </span>
          {t("enterPassword")}
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scaleY: 0 }}
        animate={{ opacity: 1, scaleY: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="hidden md:block w-px h-72 bg-gradient-to-b from-transparent via-border to-transparent"
      />

      <motion.div
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
        className="flex-1 w-full max-w-sm"
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">
              {t("password")}
            </label>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("enterPasswordPlaceholder")}
                className="w-full pl-12 pr-5 py-4 rounded-2xl border bg-background/50 focus:bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-muted-foreground/30 shadow-sm text-lg"
                required
                autoFocus
              />
            </div>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 mt-2 px-1 text-xs text-red-500 font-medium"
              >
                <ShieldAlert size={14} />
                <span>{error}</span>
              </motion.div>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="group w-full mt-2 flex items-center justify-center gap-3 px-6 py-4 bg-primary text-primary-foreground rounded-2xl hover:bg-primary/90 transition-all font-semibold disabled:opacity-70 shadow-lg shadow-primary/25 active:scale-[0.98] text-base"
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin h-5 w-5" />
                <span>{t("processing")}</span>
              </>
            ) : (
              <>
                <span>{t("openFolder")}</span>
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center sm:text-right">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground/40 font-bold">
            {t("securityEngine")}
          </span>
        </div>
      </motion.div>
    </div>
  );
}

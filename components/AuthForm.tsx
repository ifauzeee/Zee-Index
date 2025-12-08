"use client";

import { useState, useEffect } from "react";
import {
  Loader2,
  Lock,
  ArrowRight,
  ShieldQuestion,
  CheckCircle2,
  LogIn,
} from "lucide-react";
import { motion } from "framer-motion";
import { useAppStore } from "@/lib/store";
import { signIn } from "next-auth/react";

interface AuthFormProps {
  folderId?: string;
  folderName: string;
  isLoading: boolean;
  onSubmit: (id: string, pass: string) => void;
}

export default function AuthForm({
  folderId,
  folderName,
  isLoading,
  onSubmit,
}: AuthFormProps) {
  const [password, setPassword] = useState("");
  const { user, addToast } = useAppStore();
  const [isRequesting, setIsRequesting] = useState(false);
  const [requestSent, setRequestSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit("admin", password);
  };

  const handleRequestAccess = async () => {
    if (!user || user.isGuest) return;

    setIsRequesting(true);
    try {
      const res = await fetch("/api/request-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderId: folderId || "", folderName }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      setRequestSent(true);
      addToast({
        message: "Permintaan akses berhasil dikirim ke Admin.",
        type: "success",
      });
    } catch (error: any) {
      addToast({
        message: error.message || "Gagal mengirim permintaan.",
        type: "error",
      });
    } finally {
      setIsRequesting(false);
    }
  };

  useEffect(() => {
    if (!requestSent || !folderId) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/files?folderId=${folderId}`);
        if (res.ok) {
          addToast({
            message: "Akses diberikan! Memuat folder...",
            type: "success",
          });
          window.location.reload();
        }
      } catch {}
    }, 5000);

    return () => clearInterval(interval);
  }, [requestSent, folderId, addToast]);

  const isLoggedIn = user && !user.isGuest;

  return (
    <div className="w-full max-w-5xl flex flex-col md:flex-row items-center justify-center gap-12 md:gap-24 p-6">
      <motion.div
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="flex-1 flex flex-col items-center md:items-end text-center md:text-right"
      >
        <div className="p-6 bg-muted/30 rounded-full mb-6 ring-1 ring-border/50">
          <Lock
            size={64}
            className="text-muted-foreground/50"
            strokeWidth={1.5}
          />
        </div>

        <h3 className="text-3xl font-bold text-foreground tracking-tight">
          Akses Terbatas
        </h3>

        <p className="text-muted-foreground mt-4 leading-relaxed max-w-[280px] text-base">
          Folder{" "}
          <span className="font-semibold text-foreground px-1 bg-muted rounded-md">
            {folderName}
          </span>{" "}
          dilindungi.
          <br />
          Silakan masukkan kata sandi untuk melanjutkan.
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
              Kata Sandi
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Masukkan Kata Sandi..."
              className="w-full px-5 py-4 rounded-2xl border bg-background/50 focus:bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-muted-foreground/30 shadow-sm text-lg"
              required
              autoFocus
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="group w-full mt-2 flex items-center justify-center gap-3 px-6 py-4 bg-primary text-primary-foreground rounded-2xl hover:bg-primary/90 transition-all font-semibold disabled:opacity-70 shadow-lg shadow-primary/25 active:scale-[0.98] text-base"
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin h-5 w-5" />
                <span>Memproses...</span>
              </>
            ) : (
              <>
                <span>Buka Folder</span>
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-border/50 text-center">
          {isLoggedIn ? (
            requestSent ? (
              <div className="flex flex-col items-center gap-2 animate-in fade-in zoom-in">
                <div className="flex items-center justify-center gap-2 text-green-600 bg-green-500/10 py-3 px-4 rounded-xl w-full">
                  <CheckCircle2 size={18} />
                  <span className="text-sm font-medium">
                    Permintaan Terkirim
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1 animate-pulse">
                  Menunggu persetujuan admin... Halaman akan refresh otomatis.
                </p>
              </div>
            ) : (
              <button
                onClick={handleRequestAccess}
                disabled={isRequesting}
                className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center justify-center gap-2 mx-auto disabled:opacity-50"
              >
                {isRequesting ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <ShieldQuestion size={14} />
                )}
                <span>Minta Akses ke Admin</span>
              </button>
            )
          ) : (
            <div className="flex flex-col items-center gap-2">
              <span className="text-xs text-muted-foreground">
                Ingin meminta akses?
              </span>
              <button
                onClick={() => signIn("google")}
                className="text-sm font-medium text-primary hover:underline flex items-center gap-1.5"
              >
                <LogIn size={14} /> Login untuk Request
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

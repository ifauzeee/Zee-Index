"use client";

import { useState, useLayoutEffect, useEffect } from "react";
import { Loader2, Lock, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

interface AuthFormProps {
  folderName: string;
  isLoading: boolean;
  onSubmit: (id: string, pass: string) => void;
}

export default function AuthForm({
  folderName,
  isLoading,
  onSubmit,
}: AuthFormProps) {
  const [password, setPassword] = useState("");

  useIsomorphicLayoutEffect(() => {
    const originalUrl = window.location.href;
    const maskedUrl = `/protected?item=${encodeURIComponent(folderName)}`;

    window.history.replaceState(null, "", maskedUrl);

    return () => {
      window.history.replaceState(null, "", originalUrl);
    };
  }, [folderName]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit("admin", password);
  };

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
      </motion.div>
    </div>
  );
}
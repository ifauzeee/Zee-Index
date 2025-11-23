"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, ShieldCheck, ShieldOff } from "lucide-react";
import Image from "next/image";
import { useAppStore } from "@/lib/store";

export default function TwoFactorAuthSetup() {
  const [isEnabled, setIsEnabled] = useState<boolean | null>(null);
  const [qrCodeDataURL, setQrCodeDataURL] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const { addToast } = useAppStore();
  const { data: session } = useSession();

  const checkStatus = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/2fa/status");
      if (!response.ok) throw new Error("Gagal memeriksa status 2FA.");
      const data = await response.json();
      setIsEnabled(data.isEnabled);
    } catch (err: unknown) {
      addToast({
        message: err instanceof Error ? err.message : "Error",
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    if (session?.user) {
      checkStatus();
    }
  }, [session, checkStatus]);

  const handleGenerate = async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch("/api/auth/2fa/generate", {
        method: "POST",
      });
      if (!response.ok) throw new Error("Gagal membuat kode QR.");
      const data = await response.json();
      setQrCodeDataURL(data.qrCodeDataURL);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch("/api/auth/2fa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: verificationCode }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Verifikasi gagal.");
      addToast({ message: "2FA berhasil diaktifkan!", type: "success" });
      setIsEnabled(true);
      setQrCodeDataURL(null);
      setVerificationCode("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisable = async () => {
    if (
      !window.confirm(
        "Apakah Anda yakin ingin menonaktifkan Autentikasi Dua Faktor?",
      )
    )
      return;
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch("/api/auth/2fa/disable", { method: "POST" });
      if (!response.ok) throw new Error("Gagal menonaktifkan 2FA.");

      addToast({ message: "2FA berhasil dinonaktifkan.", type: "info" });
      setIsEnabled(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setIsLoading(false);
    }
  };

  if (isEnabled === null) {
    return (
      <div className="flex items-center justify-center h-24">
        <Loader2 className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {isEnabled ? (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-8 w-8 text-green-500" />
            <div>
              <p className="font-semibold">2FA Aktif</p>
              <p className="text-sm text-muted-foreground">
                Akun Anda dilindungi dengan autentikasi dua faktor.
              </p>
            </div>
          </div>
          <button
            onClick={handleDisable}
            disabled={isLoading}
            className="px-4 py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 text-sm font-semibold disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="animate-spin" /> : "Nonaktifkan"}
          </button>
        </div>
      ) : (
        <div>
          <div className="flex items-center gap-3">
            <ShieldOff className="h-8 w-8 text-red-500" />
            <div>
              <p className="font-semibold">2FA Tidak Aktif</p>
              <p className="text-sm text-muted-foreground">
                Tingkatkan keamanan akun Anda dengan mengaktifkan 2FA.
              </p>
            </div>
          </div>

          <AnimatePresence>
            {!qrCodeDataURL && (
              <motion.button
                key="enable-button"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={handleGenerate}
                disabled={isLoading}
                className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 text-sm font-semibold disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  "Aktifkan 2FA"
                )}
              </motion.button>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {qrCodeDataURL && (
              <motion.div
                key="verification-form"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-6 overflow-hidden"
              >
                <div className="border-t pt-4">
                  <p className="text-sm text-center mb-4">
                    1. Pindai kode QR ini dengan aplikasi authenticator Anda
                    (e.g., Google Authenticator).
                  </p>
                  <div className="flex justify-center p-4 bg-white rounded-lg max-w-[200px] mx-auto">
                    <Image
                      src={qrCodeDataURL}
                      alt="QR Code 2FA"
                      width={180}
                      height={180}
                    />
                  </div>
                  <p className="text-sm text-center my-4">
                    2. Masukkan kode 6 digit yang muncul di aplikasi Anda untuk
                    menyelesaikan proses.
                  </p>
                  <form
                    onSubmit={handleVerify}
                    className="flex items-center justify-center gap-2"
                  >
                    <input
                      type="text"
                      value={verificationCode}
                      onChange={(e) =>
                        setVerificationCode(e.target.value.replace(/\D/g, ""))
                      }
                      placeholder="123456"
                      maxLength={6}
                      className="w-32 text-center tracking-[0.5em] font-mono text-lg px-3 py-2 rounded-md border bg-transparent focus:ring-2 focus:ring-ring focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={isLoading || verificationCode.length !== 6}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 text-sm font-semibold disabled:opacity-50"
                    >
                      {isLoading ? (
                        <Loader2 className="animate-spin" />
                      ) : (
                        "Verifikasi"
                      )}
                    </button>
                  </form>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
      {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
    </div>
  );
}

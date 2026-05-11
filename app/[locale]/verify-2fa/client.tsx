"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { AlertCircle, Loader2, ShieldCheck } from "lucide-react";

export function Verify2FAClient() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const searchParams = useSearchParams();
  const { update, status } = useSession();

  let t;
  try {
    t = useTranslations("Auth");
  } catch {
    t = (key: string, options?: any) => {
      const dict: Record<string, string> = {
        verify2faTitle: "Verifikasi Dua Langkah",
        verify2faDesc:
          "Masukkan kode 6 digit dari aplikasi authenticator Anda.",
        codeLabel: "Kode Verifikasi",
        verifyButton: "Verifikasi",
        verifying: "Memverifikasi...",
        errorInvalid: "Kode tidak valid.",
        backToLogin: "Kembali ke Login",
      };
      return options?.fallback || dict[key] || key;
    };
  }

  const callbackUrl = searchParams.get("callbackUrl") || "/";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (code.length !== 6) {
      setError(t("errorInvalid", { fallback: "Kode harus 6 digit." }));
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/2fa/verify-login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token: code }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Gagal memverifikasi 2FA");
      }

      await update({ twoFactorVerified: true });

      router.push(callbackUrl);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  };

  if (status === "unauthenticated") {
    router.push("/login");
    return null;
  }

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 shadow-xl shadow-gray-200/50 dark:shadow-black/50 bg-white dark:bg-gray-900/80 backdrop-blur-xl p-8">
      <div className="space-y-1 pb-6 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
          <ShieldCheck className="h-8 w-8 text-blue-600 dark:text-blue-400" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
          {t("verify2faTitle", { fallback: "Verifikasi Dua Langkah" })}
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t("verify2faDesc", {
            fallback: "Masukkan kode 6 digit dari aplikasi authenticator Anda.",
          })}
        </p>
      </div>
      <div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <input
              id="code"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="000000"
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-center text-2xl tracking-[0.5em] h-14 font-mono font-bold"
              disabled={loading}
              autoFocus
            />
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="rounded-md border border-red-200 bg-red-50 p-3 flex items-start text-red-800 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-200 text-sm">
                <AlertCircle className="h-4 w-4 mt-0.5" />
                <span className="ml-2 leading-tight">{error}</span>
              </div>
            </motion.div>
          )}

          <button
            type="submit"
            className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-blue-600 text-white hover:bg-blue-600/90 w-full h-11 transition-all duration-300 active:scale-[0.98]"
            disabled={loading || code.length !== 6}
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              t("verifyButton", { fallback: "Verifikasi" })
            )}
          </button>
        </form>
      </div>
      <div className="mt-6 flex justify-center">
        <button
          type="button"
          className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
          onClick={() => router.push("/login")}
        >
          {t("backToLogin", { fallback: "Kembali ke Login" })}
        </button>
      </div>
    </div>
  );
}

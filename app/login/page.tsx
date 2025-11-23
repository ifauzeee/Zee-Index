"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { signIn } from "next-auth/react";
import "@fortawesome/fontawesome-free/css/all.min.css";

function CustomLoginPage() {
  const searchParams = useSearchParams();
  const [error, setError] = useState("");
  const [isGuestLoginDisabled, setIsGuestLoginDisabled] = useState(true);
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);

  useEffect(() => {
    const errorType = searchParams.get("error");
    if (errorType) {
      switch (errorType) {
        case "InvalidOrExpiredShareLink":
          setError(
            "Tautan berbagi yang Anda gunakan tidak valid atau telah kedaluwarsa.",
          );
          break;
        case "SessionExpired":
          setError(
            "Sesi Anda telah berakhir. Silakan login kembali untuk melanjutkan.",
          );
          break;
        case "RootAccessDenied":
          setError(
            "Anda tidak dapat mengakses halaman utama melalui tautan berbagi. Silakan gunakan tautan asli yang Anda terima.",
          );
          break;
        case "ShareLinkRevoked":
          setError("Akses untuk tautan ini telah dicabut oleh administrator.");
          break;
        case "GuestAccessDenied":
          setError(
            "Akses tamu tidak diizinkan untuk halaman ini. Silakan login menggunakan akun Google.",
          );
          break;
        case "GuestLogout":
          setError(
            "Anda telah logout dari sesi tamu. Selamat datang kembali kapan saja!",
          );
          break;
        default:
          setError("Terjadi kesalahan. Silakan coba lagi.");
          break;
      }
    }
  }, [searchParams]);

  useEffect(() => {
    const fetchPublicConfig = async () => {
      try {
        setIsLoadingConfig(true);
        const response = await fetch("/api/config/public");
        const data = await response.json();
        setIsGuestLoginDisabled(data.disableGuestLogin);
      } catch (err) {
        console.error("Gagal memuat config publik:", err);
        setIsGuestLoginDisabled(true);
      } finally {
        setIsLoadingConfig(false);
      }
    };

    fetchPublicConfig();
  }, []);

  const handleGoogleSignIn = () => {
    const callbackUrl = searchParams.get("callbackUrl") || "/";
    signIn("google", { callbackUrl });
  };

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center bg-muted/40 p-12 overflow-hidden">
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            duration: 0.8,
            type: "spring",
            stiffness: 80,
            delay: 0.2,
          }}
        >
          <i className="fab fa-google-drive text-primary/10 text-[18rem]"></i>
        </motion.div>
      </div>
      <div className="flex w-full lg:w-1/2 items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="w-full max-w-sm"
        >
          <div className="space-y-8">
            <div className="text-center lg:text-left">
              <h1 className="text-3xl font-bold flex items-center justify-center lg:justify-start">
                <i className="fab fa-google-drive text-blue-500 mr-3 text-4xl"></i>
                <span className="bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
                  Zee Index
                </span>
              </h1>
              <p className="text-muted-foreground mt-2">
                Akses file Anda dengan aman dan cepat.
              </p>
            </div>

            {error && (
              <div
                className="bg-destructive/10 border-l-4 border-destructive text-destructive-foreground p-4 rounded-md"
                role="alert"
              >
                <p className="font-bold">Akses Gagal</p>
                <p className="text-sm">{error}</p>
              </div>
            )}

            <div className="pt-4 space-y-3">
              <button
                onClick={handleGoogleSignIn}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-card border rounded-lg hover:bg-accent transition-colors font-semibold"
              >
                <i className="fab fa-google text-lg"></i>
                Lanjutkan dengan Google
              </button>

              <button
                onClick={() =>
                  signIn("guest", {
                    callbackUrl: searchParams.get("callbackUrl") || "/",
                  })
                }
                disabled={isLoadingConfig || isGuestLoginDisabled}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-muted/50 border rounded-lg hover:bg-accent transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <i className="fas fa-user text-lg"></i>
                Lanjutkan sebagai Tamu
              </button>
            </div>

            <p className="text-center text-xs text-muted-foreground pt-12">
              © {new Date().getFullYear()} - Dibuat oleh{" "}
              <a
                href="https://ifauzeee.vercel.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-foreground hover:text-primary"
              >
                Muhammad Ibnu Fauzi
              </a>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <CustomLoginPage />
    </Suspense>
  );
}

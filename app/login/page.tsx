"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { User } from "lucide-react";
import Image from "next/image";
import GoogleDrivePng from "@/app/google-drive_2991248.png";

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
          setError("Tautan berbagi yang Anda gunakan tidak valid atau telah kedaluwarsa.");
          break;
        case "SessionExpired":
          setError("Sesi Anda telah berakhir. Silakan login kembali untuk melanjutkan.");
          break;
        case "RootAccessDenied":
          setError("Anda tidak dapat mengakses halaman utama melalui tautan berbagi. Silakan gunakan tautan asli yang Anda terima.");
          break;
        case "ShareLinkRevoked":
          setError("Akses untuk tautan ini telah dicabut oleh administrator.");
          break;
        case "GuestAccessDenied":
          setError("Akses tamu tidak diizinkan untuk halaman ini. Silakan login menggunakan akun Google.");
          break;
        case "GuestLogout":
          setError("Anda telah logout dari sesi tamu. Selamat datang kembali kapan saja!");
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
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center bg-muted/40 p-12 overflow-hidden relative">
        <div className="relative w-[18rem] h-[18rem] lg:w-[22rem] lg:h-[22rem] opacity-20">
          <Image
            src={GoogleDrivePng}
            alt="Google Drive Logo"
            fill
            className="object-contain"
            priority
          />
        </div>
      </div>

      <div className="flex w-full lg:w-1/2 items-center justify-center p-8">
        <div className="w-full max-w-sm space-y-8">
          <div className="text-center lg:text-left">
            <h1 className="text-3xl font-bold flex items-center justify-center lg:justify-start">
              <div className="relative w-9 h-9 mr-3">
                <Image
                  src={GoogleDrivePng}
                  alt="Logo"
                  fill
                  className="object-contain"
                />
              </div>
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
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
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
              <User size={20} />
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
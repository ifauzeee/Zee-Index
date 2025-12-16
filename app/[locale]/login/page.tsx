"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { User, LockKeyhole } from "lucide-react";
import Image from "next/image";
import AppIcon from "@/app/icon.png";
import { useTranslations } from "next-intl";

function CustomLoginPage() {
  const t = useTranslations("LoginPage");
  const searchParams = useSearchParams();
  const [message, setMessage] = useState<{
    type: "error" | "info" | "success";
    title: string;
    text: string;
  } | null>(null);
  const [isGuestLoginDisabled, setIsGuestLoginDisabled] = useState(true);
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    const errorType = searchParams.get("error");
    if (errorType) {
      switch (errorType) {
        case "ShareLinkExpired":
          setMessage({
            type: "error",
            title: t("shareLinkExpired"),
            text: t("shareLinkExpiredMsg"),
          });
          break;
        case "InvalidOrExpiredShareLink":
          setMessage({
            type: "error",
            title: t("invalidLink"),
            text: t("invalidLinkMsg"),
          });
          break;
        case "SessionExpired":
          setMessage({
            type: "info",
            title: t("sessionExpired"),
            text: t("sessionExpiredMsg"),
          });
          break;
        case "RootAccessDenied":
          setMessage({
            type: "error",
            title: t("accessDenied"),
            text: t("accessDeniedMsg"),
          });
          break;
        case "ShareLinkRevoked":
          setMessage({
            type: "error",
            title: t("accessRevoked"),
            text: t("accessRevokedMsg"),
          });
          break;
        case "GuestAccessDenied":
          setMessage({
            type: "error",
            title: t("limitedAccess"),
            text: t("guestAccessDeniedMsg"),
          });
          break;
        case "GuestLogout":
          setMessage({
            type: "success",
            title: t("seeYou"),
            text: t("guestLogoutMsg"),
          });
          break;
        default:
          setMessage({
            type: "error",
            title: t("errorOccurred"),
            text: t("errorMsg"),
          });
          break;
      }
    }
  }, [searchParams, t]);

  useEffect(() => {
    const fetchPublicConfig = async () => {
      try {
        setIsLoadingConfig(true);
        const response = await fetch("/api/config/public", {
          cache: "no-store",
          headers: { Pragma: "no-cache" },
        });

        if (!response.ok) {
          throw new Error(t("failedToFetchConfig"));
        }

        const data = await response.json();
        setIsGuestLoginDisabled(data.disableGuestLogin === true);
      } catch (err) {
        console.error("Config fetch error:", err);
        setIsGuestLoginDisabled(true);
      } finally {
        setIsLoadingConfig(false);
      }
    };
    fetchPublicConfig();
  }, [t]);

  const handleGoogleSignIn = () => {
    const callbackUrl = searchParams.get("callbackUrl") || "/";
    signIn("google", { callbackUrl });
  };

  const handleEmailPasswordSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setMessage(null);

    try {
      const callbackUrl = searchParams.get("callbackUrl") || "/";
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setMessage({
          type: "error",
          title: t("loginFailed"),
          text: t("incorrectEmailPassword"),
        });
      } else if (result?.ok) {
        window.location.href = callbackUrl;
      }
    } catch {
      setMessage({
        type: "error",
        title: t("errorOccurred"),
        text: t("errorMsg"),
      });
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center bg-muted/40 p-12 overflow-hidden relative">
        <div className="relative w-[18rem] h-[18rem] lg:w-[22rem] lg:h-[22rem] opacity-20">
          <Image
            src={AppIcon}
            alt="Google Drive Logo"
            fill
            sizes="(max-width: 1024px) 288px, 352px"
            className="object-contain dark:invert"
          />
        </div>
      </div>

      <div className="flex w-full lg:w-1/2 items-center justify-center p-8">
        <div className="w-full max-w-sm space-y-8">
          <div className="text-center lg:text-left">
            <h1 className="text-3xl font-bold flex items-center justify-center lg:justify-start">
              <Image
                src={AppIcon}
                alt="Logo"
                width={36}
                height={36}
                priority
                className="mr-3 object-contain dark:invert"
              />

              <span className="bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
                {t("appTitle")}
              </span>
            </h1>
            <p className="text-muted-foreground mt-2">{t("appSubtitle")}</p>
          </div>

          {message && (
            <div
              className={`border-l-4 p-4 rounded-md animate-in fade-in slide-in-from-top-2 ${
                message.type === "error"
                  ? "bg-red-50 dark:bg-red-950/30 border-red-500"
                  : message.type === "success"
                    ? "bg-green-50 dark:bg-green-950/30 border-green-500"
                    : "bg-blue-50 dark:bg-blue-950/30 border-blue-500"
              }`}
              role="alert"
            >
              <p
                className={`font-bold ${
                  message.type === "error"
                    ? "text-red-800 dark:text-red-300"
                    : message.type === "success"
                      ? "text-green-800 dark:text-green-300"
                      : "text-blue-800 dark:text-blue-300"
                }`}
              >
                {message.title}
              </p>
              <p
                className={`text-sm ${
                  message.type === "error"
                    ? "text-red-700 dark:text-red-400"
                    : message.type === "success"
                      ? "text-green-700 dark:text-green-400"
                      : "text-blue-700 dark:text-blue-400"
                }`}
              >
                {message.text}
              </p>
            </div>
          )}

          <div className="pt-4 space-y-4">
            <form onSubmit={handleEmailPasswordSignIn} className="space-y-3">
              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="text-sm font-medium text-foreground"
                >
                  {t("emailLabel")}
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("emailPlaceholder")}
                  className="w-full px-4 py-3 bg-background border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-muted-foreground/50"
                  required
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="password"
                  className="text-sm font-medium text-foreground"
                >
                  {t("passwordLabel")}
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("passwordPlaceholder")}
                  className="w-full px-4 py-3 bg-background border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-muted-foreground/50"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-semibold shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isLoggingIn ? (
                  <>
                    <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    <span>{t("processing")}</span>
                  </>
                ) : (
                  <>
                    <LockKeyhole size={20} />
                    <span>{t("loginButton")}</span>
                  </>
                )}
              </button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  {t("or")}
                </span>
              </div>
            </div>

            <button
              onClick={handleGoogleSignIn}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-card border rounded-lg hover:bg-accent transition-colors font-semibold shadow-sm"
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
              {t("continueWithGoogle")}
            </button>

            <button
              onClick={() =>
                signIn("guest", {
                  callbackUrl: searchParams.get("callbackUrl") || "/",
                })
              }
              disabled={isLoadingConfig || isGuestLoginDisabled}
              className={`w-full flex items-center justify-center gap-3 px-4 py-3 border rounded-lg transition-colors font-semibold 
                ${
                  isLoadingConfig || isGuestLoginDisabled
                    ? "bg-muted text-muted-foreground cursor-not-allowed opacity-70"
                    : "bg-muted/50 hover:bg-accent cursor-pointer"
                }`}
            >
              {isLoadingConfig ? (
                <span className="animate-pulse">{t("loading")}</span>
              ) : isGuestLoginDisabled ? (
                <>
                  <LockKeyhole size={20} />
                  <span>{t("guestAccessDisabled")}</span>
                </>
              ) : (
                <>
                  <User size={20} />
                  <span>{t("continueAsGuest")}</span>
                </>
              )}
            </button>
          </div>

          <p className="text-center text-xs text-muted-foreground pt-12">
            © {new Date().getFullYear()} - {t("createdBy")}{" "}
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

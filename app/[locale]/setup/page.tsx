"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAlert } from "@/components/providers/ModalProvider";
import { useTranslations } from "next-intl";

export default function SetupPage() {
  const router = useRouter();
  const { alert } = useAlert();
  const t = useTranslations("SetupPage");
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    clientId: "",
    clientSecret: "",
    rootFolderId: "",
    authCode: "",
  });

  useEffect(() => {
    if (window.location.search.includes("code=") && step === 1) {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get("code");

      const savedDataStr = localStorage.getItem("zee_setup_temp");
      const savedData = savedDataStr ? JSON.parse(savedDataStr) : {};

      if (code && savedData.clientId) {
        setFormData((prev) => ({ ...prev, ...savedData, authCode: code }));
        setStep(2);
        window.history.replaceState({}, document.title, "/setup");
      }
    }
  }, [step]);

  const handleAuthorize = async () => {
    if (!formData.clientId || !formData.clientSecret) {
      await alert(t("fillInputs"), {
        title: t("incompleteInput"),
      });
      return;
    }

    const scope = "https://www.googleapis.com/auth/drive";
    const redirectUri = `${window.location.origin}/setup`;

    localStorage.setItem("zee_setup_temp", JSON.stringify(formData));

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${formData.clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&access_type=offline&prompt=consent`;

    window.location.href = authUrl;
  };

  const handleFinishSetup = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/setup/finish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          redirectUri: `${window.location.origin}/setup`,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        localStorage.removeItem("zee_setup_temp");
        if (data.restartNeeded) {
          await alert(t("setupSuccessRestart"), { title: t("setupComplete") });
        } else {
          await alert(t("setupSuccessRedirect"), {
            title: t("success"),
          });
          router.push("/");
        }
      } else {
        await alert(`${t("setupFailed")}: ${data.error}`, {
          title: t("setupFailed"),
          variant: "destructive",
        });
      }
    } catch {
      await alert(t("connectionError"), {
        title: "Error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen overflow-hidden bg-background text-foreground flex flex-col">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5 pointer-events-none" />

      <main className="relative flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-lg">
          <div className="flex items-center gap-4 mb-10">
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-all ${step >= 1 ? "bg-blue-500 text-white" : "bg-muted text-muted-foreground"}`}
            >
              1
            </div>
            <div
              className={`flex-1 h-0.5 transition-all ${step >= 2 ? "bg-blue-500" : "bg-border"}`}
            />
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-all ${step >= 2 ? "bg-blue-500 text-white" : "bg-muted text-muted-foreground"}`}
            >
              2
            </div>
          </div>

          {step === 1 ? (
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-semibold mb-2">{t("title")}</h2>
                <p className="text-muted-foreground">{t("subtitle")}</p>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t("clientId")}</label>
                  <input
                    placeholder="xxxxx.apps.googleusercontent.com"
                    className="w-full px-4 py-3 rounded-xl border border-border bg-background/50 backdrop-blur-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                    value={formData.clientId}
                    onChange={(e) =>
                      setFormData({ ...formData, clientId: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    {t("clientSecret")}
                  </label>
                  <input
                    type="password"
                    placeholder="GOCSPX-xxxxx"
                    className="w-full px-4 py-3 rounded-xl border border-border bg-background/50 backdrop-blur-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                    value={formData.clientSecret}
                    onChange={(e) =>
                      setFormData({ ...formData, clientSecret: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    {t("rootFolderId")}
                  </label>
                  <input
                    placeholder={t("rootFolderIdPlaceholder")}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-background/50 backdrop-blur-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                    value={formData.rootFolderId}
                    onChange={(e) =>
                      setFormData({ ...formData, rootFolderId: e.target.value })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    {t("rootFolderIdHint")}
                    <span className="text-blue-500 font-mono">FOLDER_ID</span>
                  </p>
                </div>
              </div>

              <button
                onClick={handleAuthorize}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-6 py-3.5 rounded-xl font-medium transition-all shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 flex items-center justify-center gap-2"
              >
                <svg
                  className="w-5 h-5"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                {t("authorize")}
              </button>
            </div>
          ) : (
            <div className="space-y-8">
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center mb-6 shadow-lg shadow-green-500/30">
                  <svg
                    className="w-8 h-8 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <h2 className="text-2xl font-semibold mb-2">
                  {t("authSuccessTitle")}
                </h2>
                <p className="text-muted-foreground max-w-sm">
                  {t("authSuccessMessage")}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-muted/50 border border-border/50">
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-500 flex items-center justify-center shrink-0 mt-0.5">
                    <svg
                      className="w-3 h-3"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t("processDescription")}
                  </p>
                </div>
              </div>

              <button
                onClick={handleFinishSetup}
                disabled={loading}
                className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-6 py-3.5 rounded-xl font-medium transition-all shadow-lg shadow-green-500/25 hover:shadow-green-500/40 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg
                      className="w-5 h-5 animate-spin"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    {t("processing")}
                  </>
                ) : (
                  <>
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    {t("finishSetup")}
                  </>
                )}
              </button>
            </div>
          )}

          <p className="text-center text-xs text-muted-foreground pt-12">
            © {new Date().getFullYear()} - Created by{" "}
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
      </main>
    </div>
  );
}

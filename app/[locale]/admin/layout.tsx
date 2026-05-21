"use client";

import { useEffect, Suspense } from "react";
import dynamic from "next/dynamic";
import { useAppStore } from "@/lib/store";
import { BulkActionBar } from "@/components/file-browser/BulkActionBar";
import Toast from "@/components/common/Toast";
import { AnimatePresence } from "framer-motion";
import { HardDrive } from "lucide-react";

import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";

const Header = dynamic(() => import("@/components/layout/Header"), {
  ssr: false,
});
const DetailsPanel = dynamic(
  () => import("@/components/file-browser/DetailsPanel"),
  {
    ssr: false,
  },
);
const AppFooter = () => {
  const { dataUsage } = useAppStore();
  const currentYear = new Date().getFullYear();
  const t = useTranslations("Footer");
  return (
    <footer className="text-center py-6 text-sm text-muted-foreground border-t bg-background">
      <p className="mb-2">
        <HardDrive size={14} className="inline mr-2" />
        {t("dataUsage")} <span id="data-usage-value">{dataUsage.value}</span>
      </p>
      <p>
        &copy; {currentYear} {t("rightsReserved")}{" "}
        <a
          href="https://ifauzeee.vercel.app/"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-foreground hover:text-primary"
        >
          Muhammad Ibnu Fauzi
        </a>
      </p>
    </footer>
  );
};

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const {
    refreshKey,
    toasts,
    removeToast,
    fetchUser,
    fetchDataUsage,
    detailsFile,
    setDetailsFile,
    fetchConfig,
  } = useAppStore();
  const { status } = useSession();
  const tCommon = useTranslations("Common");

  useEffect(() => {
    fetchConfig();

    if (status === "authenticated") {
      fetchUser();
      fetchDataUsage();
    }
  }, [status, fetchUser, fetchDataUsage, fetchConfig, refreshKey]);

  return (
    <>
      <div
        id="app-container"
        className={`bg-background text-foreground min-h-screen flex flex-col`}
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:shadow-lg focus:outline-none"
        >
          {tCommon("skipToContent")}
        </a>
        <Suspense fallback={<div className="h-16 bg-background" />}>
          <Header />
        </Suspense>
        <div className="container mx-auto px-4 max-w-7xl flex-grow">
          <main
            id="main-content"
            tabIndex={-1}
            className="min-h-[50vh] mb-12 outline-none"
          >
            {children}
          </main>
        </div>

        <div
          id="toast-container"
          className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3"
        >
          <AnimatePresence>
            {toasts.map((toast) => (
              <Toast key={toast.id} toast={toast} onRemove={removeToast} />
            ))}
          </AnimatePresence>
        </div>

        <AppFooter />
      </div>
      <BulkActionBar />

      <AnimatePresence>
        {detailsFile && (
          <DetailsPanel
            file={detailsFile}
            onClose={() => setDetailsFile(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

"use client";

import { Suspense, useRef } from "react";
import dynamic from "next/dynamic";
import { useAppStore } from "@/lib/store";
import { BulkActionBar } from "@/components/file-browser/BulkActionBar";
import Toast from "@/components/common/Toast";
import { AnimatePresence } from "framer-motion";
import { HardDrive } from "lucide-react";

import { useTranslations } from "next-intl";
import { useDataUsageQuery } from "@/hooks/useDataUsage";
import { cn } from "@/lib/utils";

const Sidebar = dynamic(() => import("@/components/layout/Sidebar"), {
  ssr: false,
});
const Header = dynamic(() => import("@/components/layout/Header"), {
  ssr: false,
});
const AdminSubNav = dynamic(() => import("@/components/admin/AdminSubNav"), {
  ssr: false,
});
const DetailsPanel = dynamic(
  () => import("@/components/file-browser/DetailsPanel"),
  {
    ssr: false,
  },
);
const AppFooter = () => {
  const refreshKey = useAppStore((state) => state.refreshKey);
  const { data } = useDataUsageQuery(refreshKey);
  const currentYear = new Date().getFullYear();
  const t = useTranslations("Footer");
  return (
    <footer className="text-center py-6 text-sm text-muted-foreground border-t bg-background">
      <p className="mb-2">
        <HardDrive size={14} className="inline mr-2" />
        {t("dataUsage")} <span id="data-usage-value">{data ?? ""}</span>
      </p>
      <p>
        &copy; {currentYear} {t("rightsReserved")}{" "}
        {/* ⛔ REQUIRED BY LICENSE (AGPL-3.0 Section 7). DO NOT remove/alter
            "Muhammad Ibnu Fauzi" attribution here — it must stay on all
            user-facing pages or the license is breached. */}
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
    toasts,
    removeToast,
    detailsFile,
    setDetailsFile,
    isSidebarOpen,
    setSidebarOpen,
  } = useAppStore();
  const tCommon = useTranslations("Common");
  const touchStartRef = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const touchEnd = e.changedTouches[0].clientX;
    if (touchStartRef.current < 50 && touchEnd - touchStartRef.current > 100) {
      setSidebarOpen(true);
    }
    touchStartRef.current = null;
  };

  return (
    <>
      <div
        id="app-container"
        className="bg-background text-foreground min-h-screen flex flex-col"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
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
        <div className="flex flex-1 min-h-0">
          <Suspense fallback={null}>
            <Sidebar />
          </Suspense>
          <div
            className={cn(
              "flex-1 flex flex-col transition-all duration-300 ease-in-out min-w-0 w-full",
              isSidebarOpen ? "lg:ml-64" : "ml-0",
            )}
          >
            <Suspense fallback={null}>
              <AdminSubNav />
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
          </div>
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

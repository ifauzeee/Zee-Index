"use client";

import { useEffect, useRef, Suspense, useState } from "react";
import dynamic from "next/dynamic";
import { useAppStore } from "@/lib/store";
import { BulkActionBar } from "@/components/file-browser/BulkActionBar";
import Toast from "@/components/common/Toast";
import { AnimatePresence } from "framer-motion";

import CommandPalette from "@/components/features/CommandPalette";
import GlobalAudioPlayer from "@/components/features/GlobalAudioPlayer";
import KeyboardShortcutsModal from "@/components/modals/KeyboardShortcutsModal";
import NotificationCenter from "@/components/features/NotificationCenter";
import TourGuide from "@/components/features/TourGuide";
import Sidebar from "@/components/layout/Sidebar";
import { cn } from "@/lib/utils";
import { HardDrive } from "lucide-react";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import GlobalDropZone from "@/components/file-browser/GlobalDropZone";
import { usePathname, useSearchParams } from "next/navigation";
import Loading from "@/components/common/Loading";
import { useTranslations } from "next-intl";
import { useDataUsageQuery } from "@/hooks/useDataUsage";

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
  const refreshKey = useAppStore((state) => state.refreshKey);
  const { data, isPending, isError } = useDataUsageQuery(refreshKey);
  const currentYear = new Date().getFullYear();
  const t = useTranslations("Footer");

  const displayValue = isPending ? "..." : isError ? (data ?? "Gagal") : data;

  return (
    <footer className="text-center py-6 text-sm text-muted-foreground bg-background mb-16 lg:mb-0 w-full overflow-hidden">
      <div className="mb-2 flex items-center justify-center gap-2">
        <HardDrive size={14} />
        <span>{t("dataUsage")} </span>
        <span
          id="data-usage-value"
          className={`font-medium text-foreground ${isPending ? "animate-pulse" : ""}`}
        >
          {displayValue}
        </span>
      </div>
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

function MainLayoutContent({ children }: { children: React.ReactNode }) {
  const toasts = useAppStore((state) => state.toasts);
  const removeToast = useAppStore((state) => state.removeToast);
  const detailsFile = useAppStore((state) => state.detailsFile);
  const setDetailsFile = useAppStore((state) => state.setDetailsFile);
  const isSidebarOpen = useAppStore((state) => state.isSidebarOpen);
  const setSidebarOpen = useAppStore((state) => state.setSidebarOpen);
  const addToast = useAppStore((state) => state.addToast);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const isShareMode =
    pathname?.startsWith("/share") || searchParams.has("share_token");

  const touchStartRef = useRef<number | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const effectiveSidebarOpen = mounted ? isSidebarOpen : true;

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const touchEnd = e.changedTouches[0].clientX;

    if (touchStartRef.current < 50 && touchEnd - touchStartRef.current > 100) {
      if (!isShareMode) {
        setSidebarOpen(true);
      }
    }

    touchStartRef.current = null;
  };

  const t = useTranslations("FileBrowser");
  const tCommon = useTranslations("Common");

  return (
    <div
      id="app-container"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="bg-background text-foreground flex flex-col min-h-screen w-full relative"
    >
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:shadow-lg focus:outline-none"
      >
        {tCommon("skipToContent")}
      </a>
      <Header />
      <div className="flex flex-1 container max-w-full px-0 relative">
        {!isShareMode && <Sidebar />}

        <div
          className={cn(
            "flex-1 flex flex-col transition-all duration-300 ease-in-out min-w-0 w-full relative",
            !isShareMode && effectiveSidebarOpen ? "lg:ml-64" : "ml-0",
          )}
        >
          <main
            id="main-content"
            tabIndex={-1}
            className="flex-grow container mx-auto px-4 max-w-7xl py-4 pb-20 lg:pb-8 min-w-0 outline-none"
          >
            {children}
          </main>
          <AppFooter />
        </div>
      </div>

      {!isShareMode && <MobileBottomNav />}

      <div
        id="toast-container"
        className="fixed bottom-24 lg:bottom-6 right-6 z-[9999] flex flex-col gap-3 max-w-[90vw]"
      >
        <AnimatePresence>
          {toasts.map((toast) => (
            <Toast key={toast.id} toast={toast} onRemove={removeToast} />
          ))}
        </AnimatePresence>
      </div>

      <BulkActionBar />
      <GlobalAudioPlayer />
      <CommandPalette />
      <KeyboardShortcutsModal />
      <NotificationCenter />
      <TourGuide />
      <GlobalDropZone
        onDrop={(files) => {
          addToast({
            message: t("dropReady", { count: files.length }),
            type: "info",
          });
        }}
      />

      <AnimatePresence>
        {detailsFile && (
          <DetailsPanel
            file={detailsFile}
            onClose={() => setDetailsFile(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default function MainLayout(props: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<Loading />}>
      <MainLayoutContent {...props} />
    </Suspense>
  );
}

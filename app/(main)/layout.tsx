"use client";

import { useEffect, useRef, Suspense } from "react";
import dynamic from "next/dynamic";
import { useAppStore } from "@/lib/store";
import BulkActionBar from "@/components/BulkActionBar";
import Toast from "@/components/Toast";
import { AnimatePresence } from "framer-motion";
import { Analytics } from "@vercel/analytics/next";
import { useSession } from "next-auth/react";
import CommandPalette from "@/components/CommandPalette";
import GlobalAudioPlayer from "@/components/GlobalAudioPlayer";
import KeyboardShortcutsModal from "@/components/KeyboardShortcutsModal";
import NotificationCenter from "@/components/NotificationCenter";
import Sidebar from "@/components/Sidebar";
import { cn } from "@/lib/utils";
import { HardDrive } from "lucide-react";
import MobileBottomNav from "@/components/MobileBottomNav";
import { usePathname, useSearchParams } from "next/navigation";
import Loading from "@/components/Loading";

const Header = dynamic(() => import("@/components/Header"), { ssr: false });
const DetailsPanel = dynamic(() => import("@/components/DetailsPanel"), {
  ssr: false,
});

const AppFooter = () => {
  const { dataUsage } = useAppStore();
  const currentYear = new Date().getFullYear();
  return (
    <footer className="text-center py-6 text-sm text-muted-foreground border-t bg-background mb-16 lg:mb-0 w-full overflow-hidden">
      <p className="mb-2">
        <HardDrive size={14} className="inline mr-2" />
        Total Penggunaan Data:{" "}
        <span id="data-usage-value">{dataUsage.value}</span>
      </p>
      <p>
        &copy; {currentYear} All rights reserved -{" "}
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
  const {
    refreshKey,
    toasts,
    removeToast,
    fetchUser,
    fetchDataUsage,
    detailsFile,
    setDetailsFile,
    fetchConfig,
    user,
    isSidebarOpen,
    setSidebarOpen,
  } = useAppStore();
  const { status } = useSession();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const isShareMode =
    pathname?.startsWith("/share") || searchParams.has("share_token");

  const touchStartRef = useRef<number | null>(null);

  useEffect(() => {
    fetchConfig();

    if (status === "authenticated") {
      fetchUser();
    }
  }, [status, fetchUser, fetchConfig, refreshKey]);

  useEffect(() => {
    if (user && !user.isGuest) {
      fetchDataUsage();
    }
  }, [user, fetchDataUsage, refreshKey]);

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

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="min-h-screen w-full overflow-x-hidden relative"
    >
      <div
        id="app-container"
        className={`bg-background text-foreground min-h-screen flex flex-col w-full max-w-[100vw] overflow-x-hidden`}
      >
        <Header />
        <div className="flex flex-1 container max-w-full px-0 overflow-x-hidden relative">
          {!isShareMode && <Sidebar />}

          <div
            className={cn(
              "flex-1 flex flex-col transition-all duration-300 ease-in-out min-w-0 w-full max-w-full",

              !isShareMode && isSidebarOpen ? "lg:ml-64" : "ml-0",
            )}
          >
            <div className="container mx-auto px-4 max-w-7xl flex-grow py-4 pb-24 lg:pb-4 min-w-0 overflow-x-hidden">
              <main className="min-h-[50vh] mb-12 w-full">{children}</main>
            </div>
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
      </div>
      <BulkActionBar />
      <GlobalAudioPlayer />
      <CommandPalette />
      <KeyboardShortcutsModal />
      <NotificationCenter />
      <Analytics />
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

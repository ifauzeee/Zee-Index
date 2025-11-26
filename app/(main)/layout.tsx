"use client";

import { useEffect } from "react";
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

const Header = dynamic(() => import("@/components/Header"), { ssr: false });
const DetailsPanel = dynamic(() => import("@/components/DetailsPanel"), {
  ssr: false,
});

const AppFooter = () => {
  const { dataUsage } = useAppStore();
  const currentYear = new Date().getFullYear();
  return (
    <footer className="text-center py-6 text-sm text-muted-foreground border-t bg-background">
      <p className="mb-2">
        <i className="fas fa-server mr-2"></i>Total Penggunaan Data:{" "}
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

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const {
    theme,
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
  } = useAppStore();
  const { status } = useSession();

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

  useEffect(() => {
    document.documentElement.className = theme;
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  return (
    <>
      <div
        id="app-container"
        className={`bg-background text-foreground min-h-screen flex flex-col`}
      >
        <Header />
        <div className="flex flex-1 container max-w-full px-0">
          <Sidebar />
          <div
            className={cn(
              "flex-1 flex flex-col transition-all duration-300 ease-in-out",
              isSidebarOpen ? "lg:ml-64" : "ml-0"
            )}
          >
            <div className="container mx-auto px-4 max-w-7xl flex-grow py-4">
              <main className="min-h-[50vh] mb-12">{children}</main>
            </div>
            <AppFooter />
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
    </>
  );
}
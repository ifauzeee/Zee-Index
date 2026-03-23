"use client";

import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import SidebarPanel from "./sidebar/SidebarPanel";
import { useSidebarController } from "./sidebar/useSidebarController";

export default function Sidebar() {
  const {
    mounted,
    shareToken,
    isSidebarOpen,
    setSidebarOpen,
    allManualDrives,
    rootFolderId,
    treeContextValue,
    handleTouchStart,
    handleTouchEnd,
  } = useSidebarController();

  if (!mounted) {
    return (
      <div className="hidden lg:block fixed inset-y-0 left-0 z-20 w-64 bg-card border-r border-border" />
    );
  }

  if (shareToken) {
    return null;
  }

  const panel = (
    <SidebarPanel
      onClose={() => setSidebarOpen(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      drives={allManualDrives}
      rootFolderId={rootFolderId}
      treeContextValue={treeContextValue}
    />
  );

  return (
    <>
      <div
        className={cn(
          "hidden lg:block fixed left-0 top-0 bottom-0 z-20 transition-transform duration-300 ease-out",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
        style={{ width: "16rem" }}
      >
        {panel}
      </div>
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="lg:hidden fixed inset-0 bg-black/50 z-40 touch-none"
            onClick={(event) => {
              event.preventDefault();
              setSidebarOpen(false);
            }}
          />
        )}
      </AnimatePresence>
      <div
        className={cn(
          "lg:hidden fixed inset-y-0 left-0 z-50 w-64 bg-background shadow-xl transition-transform duration-300 ease-out",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {panel}
      </div>
    </>
  );
}

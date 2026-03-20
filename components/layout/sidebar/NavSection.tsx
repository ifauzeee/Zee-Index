"use client";

import React from "react";
import {
  Home,
  Star,
  HardDrive,
  Trash2,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { useRouter, usePathname } from "next/navigation";

interface NavSectionProps {
  t: (key: string) => string;
}

export default function NavSection({ t }: NavSectionProps) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAppStore((state) => state.user);
  const navigatingId = useAppStore((state) => state.navigatingId);
  const setNavigatingId = useAppStore((state) => state.setNavigatingId);
  const setSidebarOpen = useAppStore((state) => state.setSidebarOpen);

  const handleNav = (id: string, path: string) => {
    setNavigatingId(id);
    router.push(path);
    if (window.innerWidth < 1024) setSidebarOpen(false);
  };

  return (
    <div className="mb-4 space-y-0.5">
      <button
        onClick={() => handleNav("home", "/")}
        id="sidebar-nav-home"
        className={cn(
          "w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-accent/50 transition-colors",
          (pathname === "/" || pathname.match(/^\/[a-zA-Z-]{2,5}$/)) &&
            "bg-accent font-medium text-primary",
        )}
      >
        {navigatingId === "home" ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <Home size={16} />
        )}{" "}
        {t("home")}
      </button>
      <button
        onClick={() => handleNav("favorites", "/favorites")}
        id="sidebar-nav-favorites"
        className={cn(
          "w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-accent/50 transition-colors",
          pathname.includes("/favorites") &&
            "bg-accent font-medium text-primary",
        )}
      >
        {navigatingId === "favorites" ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <Star size={16} />
        )}{" "}
        {t("favorites")}
      </button>
      <button
        onClick={() => handleNav("storage", "/storage")}
        id="sidebar-nav-storage"
        className={cn(
          "w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-accent/50 transition-colors",
          pathname.includes("/storage") &&
            "bg-accent font-medium text-primary",
        )}
      >
        {navigatingId === "storage" ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <HardDrive size={16} />
        )}{" "}
        {t("storage")}
      </button>
      {user?.role === "ADMIN" && (
        <>
          <button
            onClick={() => {
              router.push("/trash");
              if (window.innerWidth < 1024) setSidebarOpen(false);
            }}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-accent/50 transition-colors",
              pathname.includes("/trash") &&
                "bg-accent font-medium text-primary",
            )}
          >
            <Trash2 size={16} /> {t("trash")}
          </button>
          <button
            onClick={() => {
              router.push("/admin");
              if (window.innerWidth < 1024) setSidebarOpen(false);
            }}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-accent/50 transition-colors",
              pathname.includes("/admin") &&
                "bg-accent font-medium text-primary",
            )}
          >
            <ShieldCheck size={16} /> {t("admin")}
          </button>
        </>
      )}
    </div>
  );
}

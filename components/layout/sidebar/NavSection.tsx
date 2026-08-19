"use client";

import React, { useEffect, useState } from "react";
import {
  Home,
  Star,
  HardDrive,
  Trash2,
  ShieldCheck,
  Loader2,
  Server,
  User,
  LayoutDashboard,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { useRouter, usePathname } from "next/navigation";

interface NavSectionProps {
  t: (key: string, values?: Record<string, string | number | Date>) => string;
}

export default function NavSection({ t }: NavSectionProps) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAppStore((state) => state.user);
  const navigatingId = useAppStore((state) => state.navigatingId);
  const setNavigatingId = useAppStore((state) => state.setNavigatingId);
  const setSidebarOpen = useAppStore((state) => state.setSidebarOpen);
  const [pendingAccessRequests, setPendingAccessRequests] = useState(0);

  useEffect(() => {
    if (user?.role !== "ADMIN") return;
    let cancelled = false;
    fetch("/api/admin/access-requests")
      .then((res) => (res.ok ? res.json() : []))
      .then((requests: unknown[]) => {
        if (!cancelled) setPendingAccessRequests(requests.length);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [user?.role, pathname]);

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

      {!user?.isGuest && (
        <button
          onClick={() => handleNav("dashboard", "/dashboard")}
          id="sidebar-nav-dashboard"
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-accent/50 transition-colors",
            pathname.includes("/dashboard") &&
              "bg-accent font-medium text-primary",
          )}
        >
          {navigatingId === "dashboard" ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <LayoutDashboard size={16} />
          )}{" "}
          {t("dashboard")}
        </button>
      )}

      {/* Local Storage Folder */}
      {process.env.NEXT_PUBLIC_ENABLE_LOCAL_STORAGE === "true" && (
        <button
          onClick={() => handleNav("local", "/folder/local-storage%3A")}
          id="sidebar-nav-local"
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-accent/50 transition-colors",
            pathname.includes("local") && "bg-accent font-medium text-primary",
          )}
        >
          {navigatingId === "local" ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Server size={16} />
          )}{" "}
          {process.env.NEXT_PUBLIC_LOCAL_STORAGE_NAME || t("localCloud")}
        </button>
      )}
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
          pathname.includes("/storage") && "bg-accent font-medium text-primary",
        )}
      >
        {navigatingId === "storage" ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <HardDrive size={16} />
        )}{" "}
        {t("storage")}
      </button>
      {!user?.isGuest && (
        <button
          onClick={() => handleNav("profile", "/profile")}
          id="sidebar-nav-profile"
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-accent/50 transition-colors",
            pathname.includes("/profile") &&
              "bg-accent font-medium text-primary",
          )}
        >
          <User size={16} /> {t("profile")}
        </button>
      )}
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
              "w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-accent/50 transition-colors relative",
              pathname.includes("/admin") &&
                "bg-accent font-medium text-primary",
            )}
          >
            <ShieldCheck size={16} /> {t("admin")}
            {pendingAccessRequests > 0 && (
              <span
                aria-label={t("navPendingRequests", {
                  count: pendingAccessRequests,
                })}
                title={t("navPendingRequests", {
                  count: pendingAccessRequests,
                })}
                className="absolute right-2 top-1/2 -translate-y-1/2 min-w-5 h-5 px-1 flex items-center justify-center rounded-full bg-red-500 text-[10px] font-semibold text-white"
              >
                {pendingAccessRequests > 99 ? "99+" : pendingAccessRequests}
              </span>
            )}
          </button>
        </>
      )}
    </div>
  );
}

"use client";

import { Home, Star, ShieldCheck, HardDrive, Server } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import { useUser } from "@/hooks/useUser";
import { useTranslations } from "next-intl";

export default function MobileBottomNav() {
  const t = useTranslations("MobileBottomNav");
  const router = useRouter();
  const pathname = usePathname();
  const user = useUser();
  const shareToken = useAppStore((state) => state.shareToken);

  if (shareToken) return null;

  const navItems = [
    { label: t("home"), icon: Home, path: "/" },
    ...(process.env.NEXT_PUBLIC_ENABLE_LOCAL_STORAGE === "true"
      ? [
          {
            label: process.env.NEXT_PUBLIC_LOCAL_STORAGE_NAME || t("local"),
            icon: Server,
            path: "/folder/local-storage%3A",
          },
        ]
      : []),
    { label: t("favorites"), icon: Star, path: "/favorites" },
    { label: t("storage"), icon: HardDrive, path: "/storage" },
  ];

  if (user?.role === "ADMIN") {
    navItems.push({ label: t("admin"), icon: ShieldCheck, path: "/admin" });
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border lg:hidden pb-safe shadow-lg">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          const isHome = item.path === "/";
          const isActive = isHome
            ? pathname === "/" ||
              (pathname.startsWith("/folder") && !pathname.includes("local"))
            : pathname.includes(item.path) ||
              (item.path.includes("local") && pathname.includes("local"));

          const Icon = item.icon;

          return (
            <button
              key={item.path}
              onClick={() => {
                if ("vibrate" in navigator) {
                  navigator.vibrate(10);
                }
                router.push(item.path);
              }}
              className={cn(
                "flex flex-col items-center justify-center w-full h-full space-y-1 active:scale-90 transition-all duration-100",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

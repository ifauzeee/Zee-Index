"use client";

import { Home, Search, Star, ShieldCheck, HardDrive } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";

export default function MobileBottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, shareToken } = useAppStore();

  if (shareToken) return null;

  const navItems = [
    { label: "Beranda", icon: Home, path: "/" },
    { label: "Cari", icon: Search, path: "/search" },
    { label: "Favorit", icon: Star, path: "/favorites" },
    { label: "Storage", icon: HardDrive, path: "/storage" },
  ];

  if (user?.role === "ADMIN") {
    navItems.push({ label: "Admin", icon: ShieldCheck, path: "/admin" });
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-t border-border lg:hidden pb-safe">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          const isActive = pathname === item.path;
          const Icon = item.icon;

          return (
            <button
              key={item.path}
              onClick={() => router.push(item.path)}
              className={cn(
                "flex flex-col items-center justify-center w-full h-full space-y-1",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
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
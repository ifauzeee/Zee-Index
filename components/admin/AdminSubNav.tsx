"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Link2,
  Key,
  ScrollText,
  Lock,
  ShieldAlert,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/share-links", label: "Share Links", icon: Link2 },
  { href: "/admin/api-keys", label: "API Keys", icon: Key },
  { href: "/admin/audit", label: "Audit Trail", icon: ScrollText },
  { href: "/admin/protected-folders", label: "Protected Folders", icon: Lock },
  { href: "/admin/incidents", label: "Incidents", icon: ShieldAlert },
  { href: "/admin/logs", label: "Activity Logs", icon: Clock },
];

export default function AdminSubNav() {
  const pathname = usePathname();

  if (!pathname?.startsWith("/admin")) return null;

  return (
    <nav className="border-b border-border bg-card/50 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex gap-1 overflow-x-auto py-2 no-scrollbar">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50",
                )}
              >
                <Icon size={15} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

"use client";

import { useState, useEffect, Suspense, FC } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut, signIn } from "next-auth/react";
import {
  Sun,
  Moon,
  RefreshCw,
  Send,
  Coffee,
  HardDrive,
  Search as SearchIcon,
  Menu,
  LogIn,
  LogOut,
  ArrowLeft,
  ShieldCheck,
  Star,
  Github,
  Trash2,
  Bell,
  PanelLeft,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import Search from "@/components/Search";
import { AnimatePresence, motion } from "framer-motion";

const overlayVariants = {
  open: { opacity: 1 },
  closed: { opacity: 0 },
};

const navContainerVariants = {
  open: {
    transition: { staggerChildren: 0.07, delayChildren: 0.2 },
  },
  closed: {
    transition: { staggerChildren: 0.05, staggerDirection: -1 },
  },
};

const navItemVariants = {
  open: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 260,
      damping: 20,
    },
  },
  closed: {
    y: 20,
    opacity: 0,
    transition: {
      duration: 0.2,
    },
  },
};

interface MenuItem {
  id: string;
  label: string;
  icon: React.ElementType;
  href?: string;
  target?: string;
  rel?: string;
  onClick?: () => void;
}

interface MobileNavProps {
  menuItems: MenuItem[];
  publicShareLinkItems: string[];
  authButton: React.ReactNode;
  shareToken: string | null;
  user: { role?: string } | null;
  onClose: () => void;
  createLink: (href: string) => string;
}

const MobileNav: FC<MobileNavProps> = ({
  menuItems,
  publicShareLinkItems,
  authButton,
  shareToken,
  user,
  onClose,
  createLink,
}) => {
  return (
    <motion.div
      className="fixed inset-0 z-40 bg-black/50 sm:hidden"
      variants={overlayVariants}
      initial="closed"
      animate="open"
      exit="closed"
      onClick={onClose}
    >
      <motion.nav
        className="fixed inset-y-0 left-0 w-full max-w-xs bg-background flex flex-col justify-center p-8"
        initial={{ x: "-100%" }}
        animate={{ x: "0%" }}
        exit={{ x: "-100%" }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
      >
        <motion.div
          className="flex flex-col gap-5 text-lg"
          variants={navContainerVariants}
          initial="closed"
          animate="open"
        >
          {menuItems
            .filter((item) => {
              if (shareToken) {
                return publicShareLinkItems.includes(item.id);
              }
              if (
                user?.role !== "ADMIN" &&
                (item.id === "admin" ||
                  item.id === "storage" ||
                  item.id === "trash")
              ) {
                return false;
              }
              return true;
            })
            .map((item) => {
              const Icon = item.icon;
              const commonClasses =
                "flex items-center gap-4 hover:text-primary transition-colors font-medium";
              return (
                <motion.div key={item.id} variants={navItemVariants}>
                  {"href" in item && item.href ? (
                    <a
                      href={item.target ? item.href : createLink(item.href)}
                      target={item.target}
                      rel={item.rel}
                      onClick={onClose}
                      className={commonClasses}
                    >
                      <Icon size={22} />
                      <span>{item.label}</span>
                    </a>
                  ) : (
                    "onClick" in item &&
                    typeof item.onClick === "function" && (
                      <button
                        onClick={() => {
                          item.onClick!();
                          onClose();
                        }}
                        className={commonClasses}
                      >
                        <Icon size={22} />
                        <span>{item.label}</span>
                      </button>
                    )
                  )}
                </motion.div>
              );
            })}

          <motion.div
            variants={navItemVariants}
            className="pt-5 mt-5 border-t border-muted"
          >
            {authButton}
          </motion.div>
        </motion.div>
      </motion.nav>
    </motion.div>
  );
};

export default function Header() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const {
    theme,
    toggleTheme,
    triggerRefresh,
    shareToken,
    user,
    notifications,
    toggleNotificationCenter,
    toggleSidebar,
  } = useAppStore();
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const menuItems: MenuItem[] = [
    { id: "favorites", href: "/favorites", icon: Star, label: "Favorit" },
    ...(user?.role === "ADMIN"
      ? [
          { id: "admin", href: "/admin", icon: ShieldCheck, label: "Admin" },
          { id: "trash", href: "/trash", icon: Trash2, label: "Sampah" },
        ]
      : []),
    { id: "storage", href: "/storage", icon: HardDrive, label: "Penyimpanan" },
    {
      id: "theme",
      onClick: toggleTheme,
      icon: theme === "light" ? Moon : Sun,
      label: `Ganti Tema`,
    },
    {
      id: "refresh",
      onClick: triggerRefresh,
      icon: RefreshCw,
      label: "Segarkan Halaman",
    },
    {
      id: "github",
      href: "https://github.com/ifauzeee/Zee-Index",
      target: "_blank",
      rel: "noopener noreferrer",
      icon: Github,
      label: "GitHub",
    },
    {
      id: "telegram",
      href: "https://t.me/RyzeeenUniverse",
      target: "_blank",
      rel: "noopener noreferrer",
      icon: Send,
      label: "Join Grup",
    },
    {
      id: "donate",
      href: "https://ifauzeee.vercel.app/donate",
      target: "_blank",
      rel: "noopener noreferrer",
      icon: Coffee,
      label: "Donasi",
    },
  ];

  const publicShareLinkItems = [
    "storage",
    "theme",
    "refresh",
    "github",
    "telegram",
    "donate",
  ];

  const handleLogoClick = () => {
    if (!shareToken) {
      router.push("/");
    }
  };

  const handleLoginClick = () => {
    signIn("google", { callbackUrl: window.location.href });
  };

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.classList.add("mobile-menu-open");
    } else {
      document.body.classList.remove("mobile-menu-open");
    }
  }, [isMobileMenuOpen]);

  const handleGuestLogout = () => {
    signOut({ callbackUrl: "/login?error=GuestLogout" });
  };

  const authButton =
    status === "loading" ? (
      <div className="w-24 h-9 bg-muted rounded-lg animate-pulse" />
    ) : session?.user ? (
      session.user.isGuest ? (
        <button
          onClick={handleGuestLogout}
          title="Logout (Tamu)"
          className="flex items-center gap-2 sm:gap-4 hover:text-primary transition-colors text-muted-foreground"
        >
          <LogOut size={24} />
          <span className="sm:hidden">Logout (Tamu)</span>
        </button>
      ) : (
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          title="Logout"
          className="flex items-center gap-2 sm:gap-4 hover:text-primary transition-colors"
        >
          <LogOut size={24} />
          <span className="sm:hidden">Logout</span>
        </button>
      )
    ) : (
      <button
        onClick={handleLoginClick}
        title="Login"
        className="flex items-center gap-2 sm:gap-4 hover:text-primary transition-colors"
      >
        <LogIn size={24} />
        <span className="sm:hidden">Login</span>
      </button>
    );

  const createLink = (baseHref: string) => {
    if (shareToken) {
      return `${baseHref}?share_token=${shareToken}`;
    }
    return baseHref;
  };

  return (
    <>
      <header
        className={`sticky top-0 z-30 w-full transition-all duration-200 ${
          isScrolled
            ? "border-b border-border bg-card/95 shadow-sm"
            : "border-b border-transparent"
        }`}
      >
        <div className="container max-w-full px-4 flex items-center justify-between gap-4 h-16">
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={toggleSidebar}
              className="p-2 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground"
            >
              <PanelLeft size={20} />
            </button>
            <h1
              onClick={handleLogoClick}
              className={`text-xl font-bold flex items-center shrink-0 ${
                !shareToken ? "cursor-pointer" : "cursor-default"
              }`}
              title={!shareToken ? "Kembali ke Beranda" : "Zee Index"}
            >
              <i className="fab fa-google-drive text-blue-500 mr-3 text-2xl"></i>
              <span>Zee Index</span>
            </h1>
          </div>

          <div className="flex-1 min-w-0 max-w-xl hidden sm:block mx-4">
            <Suspense
              fallback={
                <div className="w-full h-10 bg-muted rounded-lg animate-pulse" />
              }
            >
              <Search />
            </Suspense>
          </div>

          <div className="hidden sm:flex items-center gap-2">
            {shareToken ? (
              <>
                {menuItems
                  .filter((item) => publicShareLinkItems.includes(item.id))
                  .map((item) => {
                    const Icon = item.icon;
                    return "href" in item && item.href ? (
                      <a
                        key={item.id}
                        href={item.target ? item.href : createLink(item.href)}
                        target={item.target}
                        rel={item.rel}
                        title={item.label}
                        className="p-2 rounded-lg hover:bg-accent"
                      >
                        <Icon size={20} />
                      </a>
                    ) : (
                      "onClick" in item &&
                        typeof item.onClick === "function" && (
                          <button
                            key={item.id}
                            onClick={item.onClick}
                            title={item.label}
                            className="p-2 rounded-lg hover:bg-accent"
                          >
                            <Icon size={20} />
                          </button>
                        )
                    );
                  })}
                {authButton}
              </>
            ) : (
              <>
                <button
                  onClick={toggleNotificationCenter}
                  className="p-2 rounded-lg hover:bg-accent relative"
                  title="Notifikasi"
                >
                  <Bell size={20} />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-background"></span>
                  )}
                </button>
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  return "href" in item && item.href ? (
                    <a
                      key={item.id}
                      href={item.href}
                      target={item.target}
                      rel={item.rel}
                      title={item.label}
                      className="p-2 rounded-lg hover:bg-accent"
                    >
                      <Icon size={20} />
                    </a>
                  ) : (
                    "onClick" in item && typeof item.onClick === "function" && (
                      <button
                        key={item.id}
                        onClick={item.onClick}
                        title={item.label}
                        className="p-2 rounded-lg hover:bg-accent"
                      >
                        <Icon size={20} />
                      </button>
                    )
                  );
                })}
                {authButton}
              </>
            )}
          </div>

          <div className="flex items-center gap-2 sm:hidden">
            <button
              onClick={toggleNotificationCenter}
              className="p-2 rounded-lg hover:bg-accent relative z-50"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-background"></span>
              )}
            </button>
            <button
              onClick={() => setIsSearchVisible(!isSearchVisible)}
              title="Cari"
              className="p-2 rounded-lg hover:bg-accent z-50"
            >
              {isSearchVisible ? (
                <ArrowLeft size={20} />
              ) : (
                <SearchIcon size={20} />
              )}
            </button>
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 rounded-lg hover:bg-accent z-50"
              title="Menu"
            >
              <Menu size={20} />
            </button>
          </div>
        </div>
      </header>

      {isSearchVisible && (
        <div className="mt-4 sm:hidden px-4">
          <Suspense fallback={null}>
            <Search onSearchClose={() => setIsSearchVisible(false)} />
          </Suspense>
        </div>
      )}

      <AnimatePresence>
        {isMobileMenuOpen && (
          <MobileNav
            menuItems={menuItems}
            publicShareLinkItems={publicShareLinkItems}
            authButton={authButton}
            shareToken={shareToken}
            user={user}
            onClose={() => setIsMobileMenuOpen(false)}
            createLink={createLink}
          />
        )}
      </AnimatePresence>
    </>
  );
}

"use client";

import { useState, useEffect, Suspense, FC } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSession, signOut, signIn } from "next-auth/react";
import { useTheme } from "next-themes";
import Image from "next/image";
import AppIcon from "@/app/icon.png";
import {
  Sun,
  Moon,
  RefreshCw,
  Send,
  Search as SearchIcon,
  Menu,
  LogIn,
  LogOut,
  ArrowLeft,
  Github,
  Bell,
  PanelLeft,
  HelpCircle,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import Search from "@/components/features/Search";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslations } from "next-intl";
import LocaleSwitcher from "@/components/common/LocaleSwitcher";

const overlayVariants = {
  open: { opacity: 1 },
  closed: { opacity: 0 },
};

const navContainerVariants = {
  open: {
    transition: { staggerChildren: 0.05, delayChildren: 0.1 },
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
      duration: 0.2,
      ease: "easeOut",
    },
  },
  closed: {
    y: 10,
    opacity: 0,
    transition: {
      duration: 0.1,
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
  onClose: () => void;
  createLink: (href: string) => string;
  localeSwitcher: React.ReactNode;
}

const MobileNav: FC<MobileNavProps> = ({
  menuItems,
  publicShareLinkItems,
  authButton,
  shareToken,
  onClose,
  createLink,
  localeSwitcher,
}) => {
  return (
    <motion.div
      className="fixed inset-0 z-40 bg-black/60 sm:hidden"
      variants={overlayVariants}
      initial="closed"
      animate="open"
      exit="closed"
      onClick={onClose}
      transition={{ duration: 0.2 }}
    >
      <motion.nav
        className="fixed inset-y-0 left-0 w-full max-w-xs bg-background flex flex-col p-6 shadow-xl overflow-y-auto"
        initial={{ x: "-100%" }}
        animate={{ x: "0%" }}
        exit={{ x: "-100%" }}
        transition={{ type: "tween", duration: 0.25, ease: "easeOut" }}
        onClick={(e) => e.stopPropagation()}
      >
        <motion.div
          className="flex flex-col gap-5 text-lg mt-4"
          variants={navContainerVariants}
          initial="closed"
          animate="open"
        >
          {menuItems
            .filter((item) => {
              if (shareToken) {
                return publicShareLinkItems.includes(item.id);
              }
              return true;
            })
            .map((item) => {
              const Icon = item.icon;
              const commonClasses =
                "flex items-center gap-4 hover:text-primary transition-colors font-medium py-1";
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
            className="pt-5 mt-2 border-t border-muted flex justify-between items-center"
          >
            {authButton}
            {localeSwitcher}
          </motion.div>
        </motion.div>
      </motion.nav>
    </motion.div>
  );
};

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const {
    triggerRefresh,
    shareToken,
    notifications,
    toggleNotificationCenter,
    toggleSidebar,
    appName,
    logoUrl,
  } = useAppStore();
  const { theme, setTheme } = useTheme();
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const t = useTranslations("Header");

  const isSharePage = pathname?.startsWith("/share");
  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY > 10;
      if (scrolled !== isScrolled) {
        setIsScrolled(scrolled);
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isScrolled]);

  const handleRefresh = () => {
    triggerRefresh();
  };

  const menuItems: MenuItem[] = [
    {
      id: "theme",
      onClick: () => setTheme(theme === "dark" ? "light" : "dark"),
      icon: theme === "light" ? Moon : Sun,
      label: t("switchTheme"),
    },
    {
      id: "refresh",
      onClick: handleRefresh,
      icon: RefreshCw,
      label: t("refreshPage"),
    },
    {
      id: "github",
      href: "https://github.com/ifauzeee/Zee-Index",
      target: "_blank",
      rel: "noopener noreferrer",
      icon: Github,
      label: t("github"),
    },
    {
      id: "telegram",
      href: "https://t.me/RyzeeenUniverse",
      target: "_blank",
      rel: "noopener noreferrer",
      icon: Send,
      label: t("joinGroup"),
    },
    {
      id: "tour",
      onClick: () => window.dispatchEvent(new Event("start-tour")),
      icon: HelpCircle,
      label: t("tour"),
    },
  ];

  const publicShareLinkItems = ["theme", "refresh", "github", "telegram"];

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
          title={t("logoutGuest")}
          className="p-2 rounded-lg hover:bg-accent text-muted-foreground"
        >
          <LogOut size={20} />
        </button>
      ) : (
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          title={t("logout")}
          className="p-2 rounded-lg hover:bg-accent"
        >
          <LogOut size={20} />
        </button>
      )
    ) : (
      <button
        onClick={handleLoginClick}
        title={t("login")}
        className="flex items-center gap-2 sm:gap-4 hover:text-primary transition-colors w-full py-2"
      >
        <LogIn size={24} />
        <span>{t("login")}</span>
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
        className={`top-0 z-30 w-full transition-colors duration-200 ${
          isScrolled
            ? "border-b border-border bg-background shadow-sm"
            : "border-b border-transparent bg-background"
        }`}
      >
        <div className="container max-w-full px-4 h-16 relative flex items-center justify-center">
          <div className="absolute left-4 flex items-center gap-3 shrink-0 z-20">
            {!isSharePage && !shareToken && (
              <button
                id="header-sidebar-toggle"
                onClick={toggleSidebar}
                className="p-2 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground"
              >
                <PanelLeft size={20} />
              </button>
            )}
            <h1
              onClick={handleLogoClick}
              className={`text-xl font-bold flex items-center shrink-0 ${
                !shareToken ? "cursor-pointer" : "cursor-default"
              }`}
              title={!shareToken ? t("backToHome") : appName}
            >
              {logoUrl ? (
                <Image
                  src={logoUrl}
                  alt="Logo"
                  width={32}
                  height={32}
                  className="w-8 h-8 mr-3 object-contain"
                  unoptimized
                />
              ) : (
                <Image
                  src={AppIcon}
                  alt="Google Drive Logo"
                  className="w-8 h-8 mr-3 dark:invert"
                />
              )}
              <span className="font-bold">{appName || "Zee Index"}</span>
            </h1>
          </div>

          <div
            className="hidden sm:block w-full max-w-xl px-4 z-10 relative"
            id="header-search-bar"
          >
            <Suspense
              fallback={
                <div className="w-full h-10 bg-muted rounded-lg animate-pulse" />
              }
            >
              <Search />
            </Suspense>
          </div>

          <div className="absolute right-4 flex items-center gap-2 z-20">
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
                    title={t("notifications")}
                    id="header-notifications-btn"
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
                        id={`header-btn-${item.id}`}
                        href={item.href}
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
                            id={`header-btn-${item.id}`}
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
                  <LocaleSwitcher />
                </>
              )}
            </div>

            <div className="flex items-center gap-2 sm:hidden">
              <button
                id="header-mobile-notifications"
                onClick={toggleNotificationCenter}
                className="p-2 rounded-lg hover:bg-accent relative z-50"
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-background"></span>
                )}
              </button>
              <button
                id="header-mobile-search"
                onClick={() => setIsSearchVisible(!isSearchVisible)}
                title={t("search")}
                className="p-2 rounded-lg hover:bg-accent z-50"
              >
                {isSearchVisible ? (
                  <ArrowLeft size={20} />
                ) : (
                  <SearchIcon size={20} />
                )}
              </button>
              <button
                id="header-mobile-menu"
                onClick={() => setIsMobileMenuOpen(true)}
                className="p-2 rounded-lg hover:bg-accent z-50"
                title={t("menu")}
              >
                <Menu size={20} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {isSearchVisible && (
        <div className="mt-4 sm:hidden px-4 pb-4 border-b border-border bg-background">
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
            onClose={() => setIsMobileMenuOpen(false)}
            createLink={createLink}
            localeSwitcher={<LocaleSwitcher />}
          />
        )}
      </AnimatePresence>
    </>
  );
}

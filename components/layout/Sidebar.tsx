"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import {
  ChevronRight,
  ChevronDown,
  Folder,
  Loader2,
  Home,
  Star,
  HardDrive,
  ShieldCheck,
  Trash2,
  X,
  Lock,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useScrollLock } from "@/hooks/useScrollLock";
import { useTranslations } from "next-intl";

interface FolderNode {
  id: string;
  name: string;
  hasChildren?: boolean;
  children?: FolderNode[];
  isExpanded?: boolean;
  isLoading?: boolean;
  isProtected?: boolean;
}

interface ManualDrive {
  id: string;
  name: string;
  isProtected?: boolean;
}

export default function Sidebar() {
  const router = useRouter();
  const {
    isSidebarOpen,
    setSidebarOpen,
    currentFolderId,
    user,
    shareToken,
    navigatingId,
    setNavigatingId,
  } = useAppStore();
  const [mounted, setMounted] = useState(false);
  const t = useTranslations("Sidebar");

  const rootFolderId = process.env.NEXT_PUBLIC_ROOT_FOLDER_ID!;

  const [tree, setTree] = useState<FolderNode>({
    id: rootFolderId,
    name: process.env.NEXT_PUBLIC_ROOT_FOLDER_NAME || t("home"),
    hasChildren: true,
    children: [],
    isExpanded: true,
  });

  useEffect(() => {
    setTree((prev) => ({
      ...prev,
      name: process.env.NEXT_PUBLIC_ROOT_FOLDER_NAME || t("home"),
    }));
  }, [t]);

  const [dbDrives, setDbDrives] = useState<ManualDrive[]>([]);
  const [isDrivesExpanded, setIsDrivesExpanded] = useState(true);
  const touchStartRef = useRef<number | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const fetchDbDrives = async () => {
      try {
        const res = await fetch("/api/admin/manual-drives");
        if (res.ok) {
          const data = await res.json();
          setDbDrives(data);
        } else if (res.status === 401) {
          console.error(
            "Unauthorized to fetch manual drives - session may have expired",
          );
        }
      } catch (e) {
        console.error("Error fetching DB drives:", e);
      }
    };
    if (mounted) fetchDbDrives();
  }, [mounted]);

  const allManualDrives = useMemo<ManualDrive[]>(() => {
    const envDrivesStr = process.env.NEXT_PUBLIC_MANUAL_DRIVES || "";

    const envDrives = envDrivesStr
      .split(",")
      .reduce<ManualDrive[]>((acc, entry) => {
        const [id, name] = entry.split(":");
        if (id && id.trim()) {
          acc.push({
            id: id.trim(),
            name: name?.trim() || id.trim(),
            isProtected: false,
          });
        }
        return acc;
      }, []);

    const dbIds = new Set(dbDrives.map((d) => d.id));
    const filteredEnv = envDrives.filter((d) => !dbIds.has(d.id));

    return [...filteredEnv, ...dbDrives];
  }, [dbDrives]);

  const isCurrentFolderShortcut = useMemo(() => {
    return allManualDrives.some((d) => d.id === currentFolderId);
  }, [allManualDrives, currentFolderId]);

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const isMobileDevice = window.innerWidth < 1024;
      setIsMobile(isMobileDevice);
      if (isMobileDevice) {
        setSidebarOpen(false);
      }
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, [setSidebarOpen]);

  useScrollLock(isSidebarOpen && isMobile && !shareToken);

  const queryClient = useQueryClient();

  const fetchSubfolders = useCallback(
    async (parentId: string) => {
      try {
        const data = await queryClient.fetchQuery({
          queryKey: ["folder-contents", parentId],
          queryFn: async () => {
            const res = await fetch(`/api/files?folderId=${parentId}`);
            if (!res.ok) throw new Error("Failed to fetch");
            return res.json();
          },
          staleTime: 60 * 1000,
        });

        return (data.files || [])
          .filter((f: any) => f.isFolder)
          .map((f: any) => ({
            id: f.id,
            name: f.name,
            hasChildren: true,
            children: [],
            isExpanded: false,
            isLoading: false,
            isProtected: f.isProtected,
          }));
      } catch (error) {
        console.error(error);
        return [];
      }
    },
    [queryClient],
  );

  const toggleNode = async (node: FolderNode, parents: string[] = []) => {
    const newTree = { ...tree };
    let current = newTree;
    for (const pid of parents) {
      if (pid === rootFolderId) continue;
      const found = current.children?.find((c) => c.id === pid);
      if (found) current = found;
    }
    const target =
      node.id === rootFolderId
        ? newTree
        : current.children?.find((c) => c.id === node.id);
    if (!target) return;
    if (
      !target.isExpanded &&
      (!target.children || target.children.length === 0)
    ) {
      target.isLoading = true;
      setTree({ ...newTree });
      const children = await fetchSubfolders(node.id);
      target.children = children;
      target.isLoading = false;
    }
    target.isExpanded = !target.isExpanded;
    setTree({ ...newTree });
  };

  useEffect(() => {
    const initRoot = async () => {
      if (tree.children && tree.children.length === 0) {
        const children = await fetchSubfolders(rootFolderId);
        setTree((prev) => ({ ...prev, children }));
      }
    };
    if (mounted) initRoot();
  }, [rootFolderId, mounted, tree.children, fetchSubfolders]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const touchEnd = e.changedTouches[0].clientX;
    if (touchStartRef.current - touchEnd > 50) {
      setSidebarOpen(false);
    }
    touchStartRef.current = null;
  };

  const renderNode = (
    node: FolderNode,
    parents: string[] = [],
    depth: number = 0,
  ) => {
    const isActive = !isCurrentFolderShortcut && currentFolderId === node.id;

    return (
      <div key={node.id} className="relative">
        <div
          className={cn(
            "flex items-center gap-1.5 py-1.5 px-2 cursor-pointer hover:bg-accent/50 text-sm rounded-md transition-colors select-none relative group my-0.5",
            isActive && "bg-accent text-accent-foreground font-medium",
          )}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={() => {
            const url = node.id === rootFolderId ? "/" : `/folder/${node.id}`;
            setNavigatingId(node.id);
            router.push(url);
            if (window.innerWidth < 1024) setSidebarOpen(false);
          }}
        >
          {depth > 0 && (
            <div
              className="absolute left-0 top-0 bottom-0 border-l border-border/40 w-px"
              style={{ left: `${depth * 16 - 4}px` }}
            />
          )}

          <div
            onClick={(e) => {
              e.stopPropagation();
              toggleNode(node, parents);
            }}
            className="p-0.5 rounded-sm hover:bg-muted text-muted-foreground transition-colors"
          >
            {node.isLoading ? (
              <Loader2 size={12} className="animate-spin" />
            ) : node.isExpanded ? (
              <ChevronDown size={12} />
            ) : (
              <ChevronRight size={12} />
            )}
          </div>
          <div className="relative shrink-0 flex items-center justify-center w-3.5 h-3.5">
            {navigatingId === node.id ? (
              <Loader2 size={12} className="animate-spin text-primary" />
            ) : (
              <>
                <Folder
                  size={14}
                  className={cn(
                    "shrink-0 transition-colors",
                    isActive
                      ? "text-primary fill-primary/20"
                      : "text-muted-foreground group-hover:text-primary",
                  )}
                />
                {node.isProtected && (
                  <div className="absolute -bottom-0.5 -right-0.5 bg-background rounded-full p-0.5">
                    <Lock size={8} className="text-primary fill-primary/20" />
                  </div>
                )}
              </>
            )}
          </div>
          <span className="truncate text-[13px] leading-none pt-0.5">
            {node.name}
          </span>
        </div>
        <AnimatePresence>
          {node.isExpanded && node.children && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="overflow-hidden relative"
            >
              {depth >= 0 && node.children.length > 0 && (
                <div
                  className="absolute top-0 bottom-2 border-l border-border/40"
                  style={{ left: `${depth * 16 + 12 + 8}px` }}
                />
              )}
              {node.children.map((child) =>
                renderNode(child, [...parents, node.id], depth + 1),
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const renderManualDrives = () => {
    if (allManualDrives.length === 0) return null;

    return (
      <div className="mb-4 space-y-1 border-t border-border pt-4 mt-2">
        <button
          onClick={() => setIsDrivesExpanded(!isDrivesExpanded)}
          className="flex items-center justify-between w-full px-3 py-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors uppercase tracking-wider"
        >
          <span>{t("sharedDrives")}</span>
          {isDrivesExpanded ? (
            <ChevronDown size={14} />
          ) : (
            <ChevronRight size={14} />
          )}
        </button>

        <AnimatePresence>
          {isDrivesExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden space-y-0.5"
            >
              {allManualDrives.map((drive) => (
                <button
                  key={drive.id}
                  onClick={() => {
                    setNavigatingId(drive.id);
                    router.push(`/folder/${drive.id}`);
                    if (window.innerWidth < 1024) setSidebarOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 text-sm rounded-md hover:bg-accent/50 transition-colors group",
                    currentFolderId === drive.id &&
                      "bg-accent font-medium text-primary",
                  )}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    {navigatingId === drive.id ? (
                      <Loader2
                        size={14}
                        className="animate-spin text-primary"
                      />
                    ) : (
                      <HardDrive
                        size={14}
                        className={
                          currentFolderId === drive.id
                            ? "text-primary"
                            : "text-muted-foreground"
                        }
                      />
                    )}
                    <span className="truncate text-[13px]">{drive.name}</span>
                  </div>
                  {drive.isProtected && (
                    <Lock
                      size={10}
                      className="text-amber-500 shrink-0 opacity-70"
                    />
                  )}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const sidebarContent = (
    <div
      className="h-full flex flex-col bg-card/50 backdrop-blur-xl border-r border-border w-64"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="p-4 border-b border-border flex items-center justify-between shrink-0 h-16">
        <h2 className="font-bold text-sm text-foreground tracking-wide flex items-center gap-2">
          {t("navigation")}
        </h2>
        <button
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden p-1 hover:bg-accent rounded-md"
        >
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1 overscroll-contain no-scrollbar">
        <div className="mb-4 space-y-0.5">
          <button
            onClick={() => {
              setNavigatingId("home");
              router.push("/");
              if (window.innerWidth < 1024) setSidebarOpen(false);
            }}
            id="sidebar-nav-home"
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-accent/50 transition-colors",
              currentFolderId === rootFolderId &&
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
            onClick={() => {
              setNavigatingId("favorites");
              router.push("/favorites");
              if (window.innerWidth < 1024) setSidebarOpen(false);
            }}
            id="sidebar-nav-favorites"
            className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-accent/50 transition-colors"
          >
            {navigatingId === "favorites" ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Star size={16} />
            )}{" "}
            {t("favorites")}
          </button>
          <button
            onClick={() => {
              setNavigatingId("storage");
              router.push("/storage");
              if (window.innerWidth < 1024) setSidebarOpen(false);
            }}
            id="sidebar-nav-storage"
            className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-accent/50 transition-colors"
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
                className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-accent/50 transition-colors"
              >
                <Trash2 size={16} /> {t("trash")}
              </button>
              <button
                onClick={() => {
                  router.push("/admin");
                  if (window.innerWidth < 1024) setSidebarOpen(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-accent/50 transition-colors"
              >
                <ShieldCheck size={16} /> {t("admin")}
              </button>
            </>
          )}
        </div>

        {renderManualDrives()}

        <div
          className="border-t border-border my-2 pt-4"
          id="sidebar-explorer-tree"
        >
          <p className="px-3 text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wider">
            {t("explorer")}
          </p>
          {renderNode(tree)}
        </div>
      </div>
    </div>
  );

  if (!mounted) {
    return (
      <div className="hidden lg:block fixed inset-y-0 left-0 z-20 w-64 bg-card border-r border-border"></div>
    );
  }

  if (shareToken) return null;

  return (
    <>
      <div
        className={cn(
          "hidden lg:block fixed left-0 top-0 bottom-0 z-20 transition-transform duration-300 ease-out",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
        style={{ width: "16rem" }}
      >
        {sidebarContent}
      </div>
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="lg:hidden fixed inset-0 bg-black/50 z-40 touch-none"
            onClick={(e) => {
              e.preventDefault();
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
        {sidebarContent}
      </div>
    </>
  );
}

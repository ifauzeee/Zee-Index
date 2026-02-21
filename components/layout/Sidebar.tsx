"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
  memo,
} from "react";
import {
  ChevronRight,
  ChevronDown,
  Folder,
  File,
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
import { useRouter, usePathname } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useScrollLock } from "@/hooks/useScrollLock";
import { useTranslations } from "next-intl";
import { fetchFolderPathApi } from "@/hooks/useFileFetching";

interface FolderNode {
  id: string;
  name: string;
  parentId: string | null;
  childIds: string[];
  isExpanded: boolean;
  isLoading: boolean;
  isProtected: boolean;
  isFolder: boolean;
  hasLoaded: boolean;
}

type FlatTree = Record<string, FolderNode>;

interface ManualDrive {
  id: string;
  name: string;
  isProtected?: boolean;
}

const TreeContext = React.createContext<{
  onToggle: (id: string) => void;
  onNavigate: (id: string) => void;
  onDrop: (e: React.DragEvent, targetId: string) => void;
  setDragOverFolderId: (id: string | null) => void;
  dragOverFolderId: string | null;
  tree: FlatTree;
  canEdit: boolean;
  rootFolderId: string;
  t: any;
} | null>(null);

const TreeNode = memo(({ id, depth = 0 }: { id: string; depth?: number }) => {
  const currentFolderId = useAppStore((state) => state.currentFolderId);
  const currentFileId = useAppStore((state) => state.currentFileId);
  const navigatingId = useAppStore((state) => state.navigatingId);
  const context = React.useContext(TreeContext);

  if (!context) return null;

  const {
    tree,
    onToggle,
    onNavigate,
    onDrop,
    setDragOverFolderId,
    dragOverFolderId,
    canEdit,
  } = context;

  const node = tree[id];
  if (!node) return null;

  const isActuallyActive =
    navigatingId === id ||
    (currentFileId ? currentFileId === id : currentFolderId === id);

  const isDragOver = dragOverFolderId === id;

  return (
    <div className="relative">
      <div
        className={cn(
          "flex items-center gap-1.5 py-1.5 px-2 cursor-pointer hover:bg-accent/50 text-sm rounded-md transition-all select-none relative group my-0.5",
          isActuallyActive && "bg-accent text-accent-foreground font-medium",
          isDragOver && "bg-primary/20 scale-[1.02] ring-2 ring-primary/50",
          node.isLoading && "opacity-70",
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onDragOver={(e) => {
          if (!canEdit) return;
          e.preventDefault();
          e.stopPropagation();
          setDragOverFolderId(node.id);
        }}
        onDragLeave={() => setDragOverFolderId(null)}
        onDrop={(e) => {
          if (!canEdit) return;
          onDrop(e, node.id);
        }}
        onClick={() => onNavigate(node.id)}
      >
        {depth > 0 && (
          <div
            className="absolute left-0 top-0 bottom-0 border-l border-border/40 w-px"
            style={{ left: `${depth * 16 - 4}px` }}
          />
        )}

        <div
          onClick={(e) => {
            if (node.isFolder) {
              e.stopPropagation();
              onToggle(node.id);
            }
          }}
          className={cn(
            "p-1.5 -ml-1.5 rounded-sm transition-colors flex items-center justify-center shrink-0",
            node.isFolder
              ? "hover:bg-muted text-muted-foreground cursor-pointer group/chevron z-10"
              : "opacity-0 cursor-default",
          )}
        >
          {node.isFolder ? (
            node.isLoading ? (
              <Loader2 size={12} className="animate-spin" />
            ) : node.isExpanded ? (
              <ChevronDown size={12} />
            ) : (
              <ChevronRight size={12} />
            )
          ) : (
            <div className="w-3" />
          )}
        </div>
        <div className="relative shrink-0 flex items-center justify-center w-3.5 h-3.5">
          {navigatingId === node.id ? (
            <Loader2 size={14} className="animate-spin text-primary" />
          ) : (
            <>
              {node.isFolder ? (
                <Folder
                  size={14}
                  className={cn(
                    "shrink-0 transition-colors",
                    isActuallyActive
                      ? "text-primary fill-primary/20"
                      : "text-muted-foreground group-hover:text-primary",
                  )}
                />
              ) : (
                <File
                  size={14}
                  className={cn(
                    "shrink-0 transition-colors",
                    isActuallyActive
                      ? "text-primary"
                      : "text-muted-foreground group-hover:text-primary",
                  )}
                />
              )}
              {node.isProtected && (
                <div className="absolute -bottom-0.5 -right-0.5 bg-background rounded-full p-0.5">
                  <Lock size={8} className="text-primary fill-primary/20" />
                </div>
              )}
            </>
          )}
        </div>
        <span className="truncate text-[13px] leading-none pt-0.5 font-medium transition-colors">
          {node.name}
        </span>
      </div>

      {node.isExpanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          transition={{ duration: 0.1, ease: "easeOut" }}
          className="overflow-hidden relative"
        >
          <div
            className="absolute top-0 bottom-2 border-l border-border/40"
            style={{ left: `${depth * 16 + 12 + 8}px` }}
          />
          {node.childIds.length > 0
            ? node.childIds.map((childId) => (
                <TreeNode key={childId} id={childId} depth={depth + 1} />
              ))
            : null}
        </motion.div>
      )}
    </div>
  );
});

TreeNode.displayName = "TreeNode";

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
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

  const canEdit =
    (user?.role === "ADMIN" || user?.role === "EDITOR") && !user?.isGuest;

  const rootFolderId = process.env.NEXT_PUBLIC_ROOT_FOLDER_ID!;

  const [tree, setTree] = useState<FlatTree>({
    [rootFolderId]: {
      id: rootFolderId,
      name: process.env.NEXT_PUBLIC_ROOT_FOLDER_NAME || t("home"),
      parentId: null,
      childIds: [],
      isExpanded: true,
      isFolder: true,
      hasLoaded: false,
      isProtected: false,
      isLoading: false,
    },
  });

  useEffect(() => {
    setTree((prev) => ({
      ...prev,
      [rootFolderId]: {
        ...prev[rootFolderId],
        name: process.env.NEXT_PUBLIC_ROOT_FOLDER_NAME || t("home"),
      },
    }));
  }, [t, rootFolderId]);

  const [dbDrives, setDbDrives] = useState<ManualDrive[]>([]);
  const [isDrivesExpanded, setIsDrivesExpanded] = useState(true);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
  const touchStartRef = useRef<number | null>(null);
  const treeRef = useRef(tree);

  useEffect(() => {
    treeRef.current = tree;
  }, [tree]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setNavigatingId(null);
  }, [pathname, setNavigatingId]);

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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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

        return (data.files || []).map((f: any) => ({
          id: f.id,
          name: f.name,
          parentId: parentId,
          childIds: [],
          isExpanded: false,
          isLoading: false,
          isProtected: f.isProtected,
          isFolder: f.isFolder,
          hasLoaded: false,
        }));
      } catch (error) {
        console.error(error);
        return [];
      }
    },
    [queryClient],
  );

  const toggleNode = useCallback(
    async (nodeId: string) => {
      const node = treeRef.current[nodeId];
      if (!node || !node.isFolder) return;

      const needsToLoad = node.childIds.length === 0 && !node.hasLoaded;

      if (needsToLoad) {
        setTree((prev) => ({
          ...prev,
          [nodeId]: { ...prev[nodeId], isLoading: true },
        }));

        const children = await fetchSubfolders(nodeId);

        setTree((prev) => {
          const newTree = { ...prev };
          newTree[nodeId] = {
            ...newTree[nodeId],
            childIds: children.map((c: any) => c.id),
            isLoading: false,
            isExpanded: true,
            hasLoaded: true,
          };
          children.forEach((c: any) => {
            if (!newTree[c.id]) {
              newTree[c.id] = c;
            }
          });
          return newTree;
        });
      } else {
        setTree((prev) => ({
          ...prev,
          [nodeId]: { ...prev[nodeId], isExpanded: !prev[nodeId].isExpanded },
        }));
      }
    },
    [fetchSubfolders],
  );

  useEffect(() => {
    const initRoot = async () => {
      const root = tree[rootFolderId];
      if (root && root.childIds.length === 0 && !root.hasLoaded) {
        const children = await fetchSubfolders(rootFolderId);
        setTree((prev) => {
          const newTree = { ...prev };
          newTree[rootFolderId] = {
            ...newTree[rootFolderId],
            childIds: children.map((c: any) => c.id),
            hasLoaded: true,
          };
          children.forEach((c: any) => {
            if (!newTree[c.id]) newTree[c.id] = c;
          });
          return newTree;
        });
      }
    };
    if (mounted) initRoot();
  }, [rootFolderId, mounted, fetchSubfolders, tree]);

  useEffect(() => {
    if (!currentFolderId || !mounted) return;

    const expandPath = async () => {
      try {
        const path = await fetchFolderPathApi(currentFolderId);
        if (!path || !Array.isArray(path)) return;

        const pathIds = path.map((p: any) => p.id);

        const currentTreeSnapshot = { ...treeRef.current };
        let stateChanged = false;

        for (const folderId of [rootFolderId, ...pathIds]) {
          const node = currentTreeSnapshot[folderId];
          if (!node) continue;

          if (!node.isExpanded) {
            currentTreeSnapshot[folderId] = { ...node, isExpanded: true };
            stateChanged = true;
          }

          if (node.childIds.length === 0 && !node.hasLoaded) {
            const children = await fetchSubfolders(folderId);
            currentTreeSnapshot[folderId] = {
              ...currentTreeSnapshot[folderId],
              childIds: children.map((c: any) => c.id),
              hasLoaded: true,
            };
            children.forEach((c: any) => {
              if (!currentTreeSnapshot[c.id]) currentTreeSnapshot[c.id] = c;
            });
            stateChanged = true;
          }
        }

        if (stateChanged) {
          setTree(currentTreeSnapshot);
        }
      } catch (error) {
        console.error("Error expanding tree:", error);
      }
    };

    expandPath();
  }, [currentFolderId, mounted, rootFolderId, fetchSubfolders]);

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

  const onNavigate = useCallback(
    (nodeId: string) => {
      const node = treeRef.current[nodeId];
      if (!node) return;

      let url = "";
      if (node.isFolder) {
        url = node.id === rootFolderId ? "/" : `/folder/${node.id}`;
        if (!node.isExpanded) {
          toggleNode(node.id);
        }
      } else {
        url = `/findpath?id=${node.id}`;
      }
      setNavigatingId(node.id);
      router.push(url);
      if (window.innerWidth < 1024) setSidebarOpen(false);
    },
    [router, rootFolderId, setNavigatingId, setSidebarOpen, toggleNode],
  );

  const onDrop = useCallback(
    (e: React.DragEvent, targetFolderId: string) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOverFolderId(null);

      let data;
      try {
        data = JSON.parse(e.dataTransfer.getData("application/json"));
      } catch {
        return;
      }

      const handleDropMove = async (
        filesToMove: any[],
        newParentId: string,
      ) => {
        try {
          const response = await fetch("/api/files/bulk-move", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fileIds: filesToMove.map((f) => f.id),
              newParentId,
            }),
          });
          const result = await response.json();
          if (!response.ok)
            throw new Error(result.error || "Gagal memindahkan item.");

          useAppStore.getState().addToast({
            message: result.message || "Item berhasil dipindahkan",
            type: "success",
          });
          useAppStore.getState().triggerRefresh();
        } catch (error: any) {
          useAppStore
            .getState()
            .addToast({ message: error.message, type: "error" });
        }
      };

      if (data.type !== "files" || !data.files) return;
      if (data.sourceFolderId === targetFolderId) return;

      handleDropMove(data.files, targetFolderId);
    },
    [setDragOverFolderId],
  );

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
            onClick={() => {
              setNavigatingId("favorites");
              router.push("/favorites");
              if (window.innerWidth < 1024) setSidebarOpen(false);
            }}
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
            onClick={() => {
              setNavigatingId("storage");
              router.push("/storage");
              if (window.innerWidth < 1024) setSidebarOpen(false);
            }}
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

        {renderManualDrives()}

        <div
          className="border-t border-border my-2 pt-4"
          id="sidebar-explorer-tree"
        >
          <p className="px-3 text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wider">
            {t("explorer")}
          </p>
          <TreeContext.Provider
            value={{
              tree,
              onToggle: toggleNode,
              onNavigate,
              onDrop,
              setDragOverFolderId,
              dragOverFolderId,
              canEdit,
              rootFolderId,
              t,
            }}
          >
            <TreeNode id={rootFolderId} />
          </TreeContext.Provider>
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

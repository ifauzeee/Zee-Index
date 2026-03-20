"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter, usePathname } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useScrollLock } from "@/hooks/useScrollLock";
import { useTranslations, useLocale } from "next-intl";
import { fetchFolderPathApi } from "@/hooks/useFileFetching";

import { TreeNode, TreeContext } from "./sidebar/TreeNode";
import NavSection from "./sidebar/NavSection";
import DriveList from "./sidebar/DriveList";
import type { FlatTree, ManualDrive } from "./sidebar/types";

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const isSidebarOpen = useAppStore((state) => state.isSidebarOpen);
  const setSidebarOpen = useAppStore((state) => state.setSidebarOpen);
  const currentFolderId = useAppStore((state) => state.currentFolderId);
  const user = useAppStore((state) => state.user);
  const shareToken = useAppStore((state) => state.shareToken);
  const navigatingId = useAppStore((state) => state.navigatingId);
  const setNavigatingId = useAppStore((state) => state.setNavigatingId);

  const [mounted, setMounted] = useState(false);
  const t = useTranslations("Sidebar");
  const locale = useLocale();

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
            if (res.status === 401 || res.status === 403) {
              return { files: [] };
            }
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
    if (!mounted) return;

    const expandPath = async () => {
      try {
        let pathIds: string[] = [];

        if (currentFolderId && currentFolderId !== rootFolderId) {
          const pathData = await queryClient.fetchQuery({
            queryKey: ["folderPath", currentFolderId, shareToken, locale],
            queryFn: () =>
              fetchFolderPathApi(currentFolderId, shareToken, locale),
            staleTime: 5 * 60 * 1000,
          });
          if (Array.isArray(pathData)) {
            pathIds = pathData.map((p: any) => p.id);
          }
        }

        const currentTreeSnapshot = { ...treeRef.current };
        let stateChanged = false;

        for (const folderId of [rootFolderId, ...pathIds]) {
          const node = currentTreeSnapshot[folderId];
          if (!node) {
            if (folderId === rootFolderId) continue;
            break;
          }

          if (node.isFolder && !node.isExpanded) {
            currentTreeSnapshot[folderId] = { ...node, isExpanded: true };
            stateChanged = true;
          }

          if (node.isFolder && node.childIds.length === 0 && !node.hasLoaded) {
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
  }, [
    currentFolderId,
    mounted,
    rootFolderId,
    fetchSubfolders,
    queryClient,
    shareToken,
    locale,
  ]);

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
        <NavSection t={t} />

        <DriveList drives={allManualDrives} t={t} />

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

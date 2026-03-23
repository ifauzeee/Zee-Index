"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter, usePathname } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { useAppStore } from "@/lib/store";
import { useScrollLock } from "@/hooks/useScrollLock";
import { fetchFolderPathApi } from "@/hooks/useFileFetching";
import type { DriveFile } from "@/lib/drive";
import { getErrorMessage } from "@/lib/errors";
import type {
  FlatTree,
  FolderNode,
  ManualDrive,
  TreeContextType,
} from "./types";

interface FolderContentsResponse {
  files?: DriveFile[];
}

interface FolderPathItem {
  id: string;
  name: string;
}

interface DropPayload {
  type?: string;
  files?: Array<Pick<DriveFile, "id">>;
  sourceFolderId?: string;
}

function parseEnvManualDrives(envValue: string): ManualDrive[] {
  return envValue.split(",").reduce<ManualDrive[]>((accumulator, entry) => {
    const [id, name] = entry.split(":");
    if (!id || !id.trim()) {
      return accumulator;
    }

    accumulator.push({
      id: id.trim(),
      name: name?.trim() || id.trim(),
      isProtected: false,
    });

    return accumulator;
  }, []);
}

export function useSidebarController() {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const t = useTranslations("Sidebar");
  const locale = useLocale();

  const isSidebarOpen = useAppStore((state) => state.isSidebarOpen);
  const setSidebarOpen = useAppStore((state) => state.setSidebarOpen);
  const currentFolderId = useAppStore((state) => state.currentFolderId);
  const user = useAppStore((state) => state.user);
  const shareToken = useAppStore((state) => state.shareToken);
  const setNavigatingId = useAppStore((state) => state.setNavigatingId);

  const [mounted, setMounted] = useState(false);
  const [dbDrives, setDbDrives] = useState<ManualDrive[]>([]);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const touchStartRef = useRef<number | null>(null);

  const canEdit =
    (user?.role === "ADMIN" || user?.role === "EDITOR") && !user?.isGuest;
  const rootFolderId = process.env.NEXT_PUBLIC_ROOT_FOLDER_ID!;
  const rootFolderName = process.env.NEXT_PUBLIC_ROOT_FOLDER_NAME || t("home");

  const [tree, setTree] = useState<FlatTree>({
    [rootFolderId]: {
      id: rootFolderId,
      name: rootFolderName,
      parentId: null,
      childIds: [],
      isExpanded: true,
      isFolder: true,
      hasLoaded: false,
      isProtected: false,
      isLoading: false,
    },
  });

  const treeRef = useRef(tree);

  useEffect(() => {
    treeRef.current = tree;
  }, [tree]);

  useEffect(() => {
    setTree((prev) => ({
      ...prev,
      [rootFolderId]: {
        ...prev[rootFolderId],
        name: rootFolderName,
      },
    }));
  }, [rootFolderId, rootFolderName]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setNavigatingId(null);
  }, [pathname, setNavigatingId]);

  useEffect(() => {
    const fetchDbDrives = async () => {
      try {
        const response = await fetch("/api/admin/manual-drives");
        if (response.ok) {
          const data: ManualDrive[] = await response.json();
          setDbDrives(data);
        } else if (response.status === 401) {
          console.error(
            "Unauthorized to fetch manual drives - session may have expired",
          );
        }
      } catch (error) {
        console.error("Error fetching DB drives:", error);
      }
    };

    if (mounted) {
      fetchDbDrives();
    }
  }, [mounted]);

  const allManualDrives = useMemo<ManualDrive[]>(() => {
    const envDrives = parseEnvManualDrives(
      process.env.NEXT_PUBLIC_MANUAL_DRIVES || "",
    );
    const dbIds = new Set(dbDrives.map((drive) => drive.id));
    const filteredEnvDrives = envDrives.filter((drive) => !dbIds.has(drive.id));
    return [...filteredEnvDrives, ...dbDrives];
  }, [dbDrives]);

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

  const fetchSubfolders = useCallback(
    async (parentId: string): Promise<FolderNode[]> => {
      try {
        const data = await queryClient.fetchQuery<FolderContentsResponse>({
          queryKey: ["folder-contents", parentId],
          queryFn: async () => {
            const response = await fetch(`/api/files?folderId=${parentId}`);
            if (response.status === 401 || response.status === 403) {
              return { files: [] };
            }
            if (!response.ok) {
              throw new Error("Failed to fetch");
            }
            return response.json();
          },
          staleTime: 60 * 1000,
        });

        return (data.files || []).map((file) => ({
          id: file.id,
          name: file.name,
          parentId,
          childIds: [],
          isExpanded: false,
          isLoading: false,
          isProtected: file.isProtected ?? false,
          isFolder: file.isFolder,
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
      if (!node || !node.isFolder) {
        return;
      }

      const needsToLoad = node.childIds.length === 0 && !node.hasLoaded;
      if (!needsToLoad) {
        setTree((prev) => ({
          ...prev,
          [nodeId]: { ...prev[nodeId], isExpanded: !prev[nodeId].isExpanded },
        }));
        return;
      }

      setTree((prev) => ({
        ...prev,
        [nodeId]: { ...prev[nodeId], isLoading: true },
      }));

      const children = await fetchSubfolders(nodeId);
      setTree((prev) => {
        const nextTree = { ...prev };
        nextTree[nodeId] = {
          ...nextTree[nodeId],
          childIds: children.map((child) => child.id),
          isLoading: false,
          isExpanded: true,
          hasLoaded: true,
        };
        children.forEach((child) => {
          if (!nextTree[child.id]) {
            nextTree[child.id] = child;
          }
        });
        return nextTree;
      });
    },
    [fetchSubfolders],
  );

  useEffect(() => {
    if (!mounted) {
      return;
    }

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
            pathIds = pathData.map((pathItem: FolderPathItem) => pathItem.id);
          }
        }

        const nextTree = { ...treeRef.current };
        let stateChanged = false;

        for (const folderId of [rootFolderId, ...pathIds]) {
          const node = nextTree[folderId];
          if (!node) {
            if (folderId === rootFolderId) {
              continue;
            }
            break;
          }

          if (node.isFolder && !node.isExpanded) {
            nextTree[folderId] = { ...node, isExpanded: true };
            stateChanged = true;
          }

          if (node.isFolder && node.childIds.length === 0 && !node.hasLoaded) {
            const children = await fetchSubfolders(folderId);
            nextTree[folderId] = {
              ...nextTree[folderId],
              childIds: children.map((child) => child.id),
              hasLoaded: true,
            };
            children.forEach((child) => {
              if (!nextTree[child.id]) {
                nextTree[child.id] = child;
              }
            });
            stateChanged = true;
          }
        }

        if (stateChanged) {
          setTree(nextTree);
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

  const handleTouchStart = (event: React.TouchEvent) => {
    touchStartRef.current = event.targetTouches[0].clientX;
  };

  const handleTouchEnd = (event: React.TouchEvent) => {
    if (!touchStartRef.current) {
      return;
    }

    const touchEnd = event.changedTouches[0].clientX;
    if (touchStartRef.current - touchEnd > 50) {
      setSidebarOpen(false);
    }
    touchStartRef.current = null;
  };

  const onNavigate = useCallback(
    (nodeId: string) => {
      const node = treeRef.current[nodeId];
      if (!node) {
        return;
      }

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
      if (window.innerWidth < 1024) {
        setSidebarOpen(false);
      }
    },
    [router, rootFolderId, setNavigatingId, setSidebarOpen, toggleNode],
  );

  const onDrop = useCallback(
    (event: React.DragEvent, targetFolderId: string) => {
      event.preventDefault();
      event.stopPropagation();
      setDragOverFolderId(null);

      let data: DropPayload;
      try {
        data = JSON.parse(
          event.dataTransfer.getData("application/json"),
        ) as DropPayload;
      } catch {
        return;
      }

      const handleDropMove = async (
        filesToMove: Array<Pick<DriveFile, "id">>,
        newParentId: string,
      ) => {
        try {
          const response = await fetch("/api/files/bulk-move", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fileIds: filesToMove.map((file) => file.id),
              newParentId,
            }),
          });
          const result = await response.json();
          if (!response.ok) {
            throw new Error(result.error || "Gagal memindahkan item.");
          }

          useAppStore.getState().addToast({
            message: result.message || "Item berhasil dipindahkan",
            type: "success",
          });
          useAppStore.getState().triggerRefresh();
        } catch (error: unknown) {
          useAppStore.getState().addToast({
            message: getErrorMessage(error, "Gagal memindahkan item."),
            type: "error",
          });
        }
      };

      if (data.type !== "files" || !data.files) {
        return;
      }
      if (data.sourceFolderId === targetFolderId) {
        return;
      }

      handleDropMove(data.files, targetFolderId);
    },
    [],
  );

  const treeContextValue = useMemo<TreeContextType>(
    () => ({
      tree,
      onToggle: toggleNode,
      onNavigate,
      onDrop,
      setDragOverFolderId,
      dragOverFolderId,
      canEdit,
      rootFolderId,
    }),
    [
      tree,
      toggleNode,
      onNavigate,
      onDrop,
      dragOverFolderId,
      canEdit,
      rootFolderId,
    ],
  );

  return {
    mounted,
    shareToken,
    isSidebarOpen,
    setSidebarOpen,
    isMobile,
    allManualDrives,
    rootFolderId,
    treeContextValue,
    handleTouchStart,
    handleTouchEnd,
  };
}

"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
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
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface FolderNode {
  id: string;
  name: string;
  hasChildren?: boolean;
  children?: FolderNode[];
  isExpanded?: boolean;
  isLoading?: boolean;
}

interface ManualDrive {
  id: string;
  name: string;
  isProtected?: boolean;
}

export default function Sidebar() {
  const router = useRouter();
  const { isSidebarOpen, setSidebarOpen, currentFolderId, user, shareToken } =
    useAppStore();

  const [mounted, setMounted] = useState(false);

  const rootFolderId = process.env.NEXT_PUBLIC_ROOT_FOLDER_ID!;

  const [tree, setTree] = useState<FolderNode>({
    id: rootFolderId,
    name: process.env.NEXT_PUBLIC_ROOT_FOLDER_NAME || "Home",
    hasChildren: true,
    children: [],
    isExpanded: true,
  });

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
        }
      } catch (e) {
        console.error("Failed fetching DB drives", e);
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

  useEffect(() => {
    if (!mounted) return;

    if (shareToken) {
      document.body.classList.remove("mobile-menu-open");
      return;
    }
    const handleBodyScroll = () => {
      if (window.innerWidth < 1024 && isSidebarOpen) {
        document.body.classList.add("mobile-menu-open");
      } else {
        document.body.classList.remove("mobile-menu-open");
      }
    };
    handleBodyScroll();
    window.addEventListener("resize", handleBodyScroll);
    return () => {
      window.removeEventListener("resize", handleBodyScroll);
      document.body.classList.remove("mobile-menu-open");
    };
  }, [isSidebarOpen, shareToken, mounted]);

  const fetchSubfolders = async (parentId: string) => {
    const url = `/api/files?folderId=${parentId}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return data.files
      .filter((f: any) => f.isFolder)
      .map((f: any) => ({
        id: f.id,
        name: f.name,
        hasChildren: true,
        children: [],
        isExpanded: false,
        isLoading: false,
      }));
  };

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
  }, [rootFolderId, mounted]);

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

  const renderNode = (node: FolderNode, parents: string[] = []) => {
    const isActive = currentFolderId === node.id;
    const paddingLeft = (parents.length + 1) * 12;
    return (
      <div key={node.id}>
        <div
          className={cn(
            "flex items-center gap-1 py-1.5 px-2 cursor-pointer hover:bg-accent/50 text-sm rounded-md transition-colors select-none",
            isActive && "bg-accent text-accent-foreground font-medium",
          )}
          style={{ paddingLeft: `${paddingLeft}px` }}
          onClick={() => {
            const url = node.id === rootFolderId ? "/" : `/folder/${node.id}`;
            router.push(url);
            if (window.innerWidth < 1024) setSidebarOpen(false);
          }}
        >
          <div
            onClick={(e) => {
              e.stopPropagation();
              toggleNode(node, parents);
            }}
            className="p-0.5 rounded-sm hover:bg-muted"
          >
            {node.isLoading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : node.isExpanded ? (
              <ChevronDown size={14} />
            ) : (
              <ChevronRight size={14} />
            )}
          </div>
          <Folder
            size={16}
            className={cn(
              "shrink-0",
              isActive
                ? "text-primary fill-primary/20"
                : "text-muted-foreground",
            )}
          />
          <span className="truncate">{node.name}</span>
        </div>
        <AnimatePresence>
          {node.isExpanded && node.children && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="overflow-hidden"
            >
              {node.children.map((child) =>
                renderNode(child, [...parents, node.id]),
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
          className="flex items-center justify-between w-full px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <span>SHARED DRIVES</span>
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
              className="overflow-hidden space-y-1"
            >
              {allManualDrives.map((drive) => (
                <button
                  key={drive.id}
                  onClick={() => {
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
                    <HardDrive size={16} />
                    <span className="truncate">{drive.name}</span>
                  </div>
                  {drive.isProtected && (
                    <Lock
                      size={12}
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
      className="h-full flex flex-col bg-card border-r border-border w-64"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h2 className="font-semibold text-sm text-muted-foreground tracking-wider">
          NAVIGASI
        </h2>
        <button
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden p-1 hover:bg-accent rounded-md"
        >
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-4 px-2 space-y-1 overscroll-contain">
        <div className="mb-4 space-y-1">
          <button
            onClick={() => {
              router.push("/");
              if (window.innerWidth < 1024) setSidebarOpen(false);
            }}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-accent/50 transition-colors",
              currentFolderId === rootFolderId && "bg-accent font-medium",
            )}
          >
            <Home size={18} /> Beranda
          </button>
          <button
            onClick={() => {
              router.push("/favorites");
              if (window.innerWidth < 1024) setSidebarOpen(false);
            }}
            className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-accent/50 transition-colors"
          >
            <Star size={18} /> Favorit
          </button>
          <button
            onClick={() => {
              router.push("/storage");
              if (window.innerWidth < 1024) setSidebarOpen(false);
            }}
            className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-accent/50 transition-colors"
          >
            <HardDrive size={18} /> Penyimpanan
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
                <Trash2 size={18} /> Sampah
              </button>
              <button
                onClick={() => {
                  router.push("/admin");
                  if (window.innerWidth < 1024) setSidebarOpen(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-accent/50 transition-colors"
              >
                <ShieldCheck size={18} /> Admin
              </button>
            </>
          )}
        </div>

        {renderManualDrives()}

        <div className="border-t border-border my-2 pt-2">
          <p className="px-3 text-xs font-medium text-muted-foreground mb-2">
            FOLDER SAYA
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

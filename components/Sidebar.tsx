"use client";

import React, { useState, useEffect, useRef } from "react";
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

export default function Sidebar() {
  const router = useRouter();
  const { isSidebarOpen, setSidebarOpen, currentFolderId, user, shareToken } =
    useAppStore();
  const rootFolderId = process.env.NEXT_PUBLIC_ROOT_FOLDER_ID!;
  const [tree, setTree] = useState<FolderNode>({
    id: rootFolderId,
    name: process.env.NEXT_PUBLIC_ROOT_FOLDER_NAME || "Home",
    hasChildren: true,
    children: [],
    isExpanded: true,
  });

  const touchStartRef = useRef<number | null>(null);

  const fetchSubfolders = async (parentId: string) => {
    let url = `/api/files?folderId=${parentId}`;
    if (shareToken) url += `&share_token=${shareToken}`;

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
    initRoot();
  }, [rootFolderId]);

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
            if (shareToken && node.id === rootFolderId) return;
            let url = node.id === rootFolderId ? "/" : `/folder/${node.id}`;
            if (shareToken) url += `?share_token=${shareToken}`;
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

      <div className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
        <div className="mb-4 space-y-1">
          <button
            onClick={() => router.push("/")}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-accent/50 transition-colors",
              currentFolderId === rootFolderId && "bg-accent font-medium",
            )}
          >
            <Home size={18} /> Beranda
          </button>
          <button
            onClick={() => router.push("/favorites")}
            className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-accent/50 transition-colors"
          >
            <Star size={18} /> Favorit
          </button>
          <button
            onClick={() => router.push("/storage")}
            className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-accent/50 transition-colors"
          >
            <HardDrive size={18} /> Penyimpanan
          </button>
          {user?.role === "ADMIN" && (
            <>
              <button
                onClick={() => router.push("/trash")}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-accent/50 transition-colors"
              >
                <Trash2 size={18} /> Sampah
              </button>
              <button
                onClick={() => router.push("/admin")}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-accent/50 transition-colors"
              >
                <ShieldCheck size={18} /> Admin
              </button>
            </>
          )}
        </div>

        <div className="border-t border-border my-2 pt-2">
          <p className="px-3 text-xs font-medium text-muted-foreground mb-2">
            FOLDER
          </p>
          {renderNode(tree)}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div
        className={cn(
          "hidden lg:block fixed left-0 top-16 bottom-0 z-20 transition-transform duration-300 ease-out",
          isSidebarOpen
            ? "translate-x-0"
            : "-translate-x-full",
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
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden fixed inset-0 bg-black/50 z-40"
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
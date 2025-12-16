"use client";

import React, { useEffect, useRef } from "react";
import {
  Share2,
  Upload,
  CheckSquare,
  Info,
  LayoutTemplate,
  UploadCloud,
  Home,
  ChevronRight,
  AlignJustify,
  StretchHorizontal,
  ArrowDownUp,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import ViewToggle from "@/components/FileBrowser/ViewToggle";
import { useTranslations } from "next-intl";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface FileBrowserHeaderProps {
  history: { id: string; name: string }[];
  shareToken: string | null;
  isAdmin: boolean;
  isBulkMode: boolean;
  view: "list" | "grid" | "gallery" | "timeline";
  dragOverBreadcrumb: string | null;
  onBreadcrumbClick: (id: string) => void;
  onBreadcrumbDragOver: (e: React.DragEvent, id: string) => void;
  onBreadcrumbDragLeave: (e: React.DragEvent) => void;
  onBreadcrumbDrop: (e: React.DragEvent, folder: { id: string }) => void;
  onUploadClick: () => void;
  onShareFolderClick: () => void;
  onToggleBulkMode: () => void;
  onSetView: (view: "list" | "grid" | "gallery" | "timeline") => void;
  onDetailsClick: (e?: React.MouseEvent) => void;
  activeFileId: string | null;
  onRequestFileClick: () => void;
  sort: { key: string; order: "asc" | "desc" };
  onSortChange: (key: "name" | "size" | "modifiedTime") => void;
}

export default function FileBrowserHeader({
  history,
  shareToken,
  isAdmin,
  isBulkMode,
  view,
  dragOverBreadcrumb,
  onBreadcrumbClick,
  onBreadcrumbDragOver,
  onBreadcrumbDragLeave,
  onBreadcrumbDrop,
  onUploadClick,
  onShareFolderClick,
  onToggleBulkMode,
  onSetView,
  onDetailsClick,
  activeFileId,
  onRequestFileClick,
  sort,
  onSortChange,
}: FileBrowserHeaderProps) {
  const navRef = useRef<HTMLElement>(null);
  const { density, setDensity } = useAppStore();
  const t = useTranslations("FileBrowserHeader");
  const tCommon = useTranslations("Common");

  const showAdminActions = !shareToken && isAdmin;
  const sortLabels = {
    name: tCommon("name"),
    modifiedTime: tCommon("date"),
    size: tCommon("size"),
  };

  useEffect(() => {
    if (navRef.current) {
      navRef.current.scrollLeft = navRef.current.scrollWidth;
    }
  }, [history]);

  return (
    <div
      className={cn(
        "flex gap-4 py-4 transition-all duration-300",
        showAdminActions ? "flex-col" : "flex-row items-center justify-between",
      )}
    >
      <nav
        ref={navRef}
        className={cn(
          "flex items-center gap-1 overflow-x-auto whitespace-nowrap no-scrollbar px-1 py-1 mask-gradient-right",
          showAdminActions ? "w-full" : "flex-1 min-w-0 pr-4",
        )}
      >
        {history.map((folder, index) => {
          const isLast = index === history.length - 1;
          const isRoot = index === 0;
          const isClickable = !(shareToken && isRoot);

          return (
            <div key={folder.id} className="flex items-center shrink-0">
              <button
                onClick={() => {
                  if (isClickable) {
                    onBreadcrumbClick(folder.id);
                  }
                }}
                disabled={!isClickable}
                onDragOver={(e) => onBreadcrumbDragOver(e, folder.id)}
                onDragLeave={onBreadcrumbDragLeave}
                onDrop={(e) => onBreadcrumbDrop(e, folder)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all border",
                  isLast
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : isClickable
                      ? "bg-card text-muted-foreground border-border hover:bg-accent hover:text-foreground"
                      : "bg-transparent text-muted-foreground border-transparent cursor-default opacity-70",
                  dragOverBreadcrumb === folder.id &&
                    "ring-2 ring-primary ring-offset-2",
                )}
              >
                {isRoot && <Home size={14} />}
                <span className="max-w-[120px] md:max-w-[200px] truncate">
                  {folder.name}
                </span>
              </button>

              {!isLast && (
                <ChevronRight
                  size={14}
                  className="text-muted-foreground mx-1 opacity-50"
                />
              )}
            </div>
          );
        })}
      </nav>

      <div
        className={cn(
          "flex items-center gap-4",
          showAdminActions
            ? "justify-between w-full md:justify-end"
            : "justify-end shrink-0",
        )}
      >
        {showAdminActions && (
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar p-1 pr-4 -ml-1 w-full md:w-auto">
            <button
              onClick={onUploadClick}
              className="p-2 rounded-lg bg-card border hover:bg-accent hover:text-primary transition-colors shadow-sm flex items-center justify-center shrink-0"
              title={t("uploadOrCreate")}
            >
              <Upload size={18} />
            </button>

            <button
              onClick={onRequestFileClick}
              className="p-2 rounded-lg bg-card border hover:bg-accent hover:text-purple-500 transition-colors shadow-sm flex items-center justify-center shrink-0"
              title={t("createFileRequest")}
            >
              <UploadCloud size={18} />
            </button>

            <button
              onClick={onShareFolderClick}
              className="p-2 rounded-lg bg-card border hover:bg-accent hover:text-blue-500 transition-colors shadow-sm flex items-center justify-center shrink-0"
              title={t("shareThisFolder")}
            >
              <Share2 size={18} />
            </button>

            <div className="w-px h-6 bg-border mx-1 hidden sm:block shrink-0"></div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="p-2 rounded-lg bg-card border hover:bg-accent transition-colors shadow-sm flex items-center justify-center shrink-0 gap-2 px-3"
                  title={t("sortFiles")}
                >
                  <ArrowDownUp size={16} />
                  <span className="text-sm font-medium">
                    {sortLabels[sort.key as keyof typeof sortLabels]}
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onSortChange("name")}>
                  {tCommon("name")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onSortChange("modifiedTime")}>
                  {tCommon("date")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onSortChange("size")}>
                  {tCommon("size")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <button
              onClick={onDetailsClick}
              disabled={!activeFileId}
              className="p-2 rounded-lg bg-card border hover:bg-accent transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed hidden sm:flex items-center justify-center shrink-0"
              title={t("viewDetails")}
            >
              <Info size={18} />
            </button>

            <button
              onClick={onToggleBulkMode}
              className={cn(
                "p-2 rounded-lg border transition-colors shadow-sm flex items-center justify-center shrink-0",
                isBulkMode
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-card hover:bg-accent border-border",
              )}
              title={t("selectMultiple")}
            >
              <CheckSquare size={18} />
            </button>
          </div>
        )}

        <div className="flex items-center gap-2 shrink-0 ml-auto">
          {view === "list" && (
            <button
              onClick={() =>
                setDensity(density === "compact" ? "comfortable" : "compact")
              }
              className={cn(
                "p-1.5 rounded-md transition-all",
                "text-muted-foreground hover:text-foreground hover:bg-background border border-border",
              )}
              title={
                density === "compact" ? t("comfortableMode") : t("compactMode")
              }
            >
              {density === "compact" ? (
                <StretchHorizontal size={18} />
              ) : (
                <AlignJustify size={18} />
              )}
            </button>
          )}
          <ViewToggle
            currentView={
              view === "gallery" ? "grid" : (view as "list" | "grid")
            }
            onToggle={(newView) => {
              onSetView(newView);
            }}
          />
          {view !== "gallery" && view !== "timeline" && (
            <>
              <div className="w-px h-6 bg-border"></div>
              <button
                onClick={() => onSetView("gallery")}
                className={cn(
                  "p-1.5 rounded-md transition-all border border-border",
                  "text-muted-foreground hover:text-foreground hover:bg-background",
                )}
                title={t("galleryView")}
              >
                <LayoutTemplate size={18} />
              </button>
              <button
                onClick={() => onSetView("timeline")}
                className={cn(
                  "p-1.5 rounded-md transition-all border border-border",
                  "text-muted-foreground hover:text-foreground hover:bg-background",
                )}
                title="Timeline View"
              >
                <Calendar size={18} />
              </button>
            </>
          )}
          {(view === "gallery" || view === "timeline") && (
            <button
              onClick={() => onSetView("list")}
              className={cn(
                "p-1.5 rounded-md transition-all border border-border",
                "text-muted-foreground hover:text-foreground hover:bg-background",
              )}
              title="Close Special View"
            >
              <AlignJustify size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

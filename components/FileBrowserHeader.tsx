import React, { useEffect, useRef } from "react";
import {
  Share2,
  Upload,
  CheckSquare,
  List,
  Grid,
  Info,
  LayoutTemplate,
  UploadCloud,
  Home,
  ChevronRight,
  AlignJustify,
  StretchHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";

interface FileBrowserHeaderProps {
  history: { id: string; name: string }[];
  shareToken: string | null;
  isAdmin: boolean;
  isBulkMode: boolean;
  view: "list" | "grid" | "gallery";
  dragOverBreadcrumb: string | null;
  onBreadcrumbClick: (id: string) => void;
  onBreadcrumbDragOver: (e: React.DragEvent, id: string) => void;
  onBreadcrumbDragLeave: (e: React.DragEvent) => void;
  onBreadcrumbDrop: (e: React.DragEvent, folder: { id: string }) => void;
  onUploadClick: () => void;
  onShareFolderClick: () => void;
  onToggleBulkMode: () => void;
  onSetView: (view: "list" | "grid" | "gallery") => void;
  onDetailsClick: (e?: React.MouseEvent) => void;
  activeFileId: string | null;
  onRequestFileClick: () => void;
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
}: FileBrowserHeaderProps) {
  const navRef = useRef<HTMLElement>(null);
  const { density, setDensity } = useAppStore();

  const showAdminActions = !shareToken && isAdmin;

  useEffect(() => {
    if (navRef.current) {
      navRef.current.scrollLeft = navRef.current.scrollWidth;
    }
  }, [history]);

  return (
    <div
      className={cn(
        "flex gap-4 py-4 transition-all duration-300",
        showAdminActions
          ? "flex-col"
          : "flex-col md:flex-row md:items-center md:justify-between",
      )}
    >
      <nav
        ref={navRef}
        className={cn(
          "flex items-center gap-1 overflow-x-auto whitespace-nowrap no-scrollbar px-1 py-1 mask-gradient-right",
          showAdminActions ? "w-full" : "w-full md:flex-1",
        )}
      >
        {history.map((folder, index) => {
          const isLast = index === history.length - 1;
          const isRoot = index === 0;

          return (
            <div key={folder.id} className="flex items-center shrink-0">
              <button
                onClick={() => onBreadcrumbClick(folder.id)}
                onDragOver={(e) => onBreadcrumbDragOver(e, folder.id)}
                onDragLeave={onBreadcrumbDragLeave}
                onDrop={(e) => onBreadcrumbDrop(e, folder)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all border",
                  isLast
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-card text-muted-foreground border-border hover:bg-accent hover:text-foreground",
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
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 md:pb-0">
            <button
              onClick={onUploadClick}
              className="p-2 rounded-lg bg-card border hover:bg-accent hover:text-primary transition-colors shadow-sm flex items-center justify-center"
              title="Upload atau Buat Folder"
            >
              <Upload size={18} />
            </button>

            <button
              onClick={onRequestFileClick}
              className="p-2 rounded-lg bg-card border hover:bg-accent hover:text-purple-500 transition-colors shadow-sm flex items-center justify-center"
              title="Buat Link Terima File"
            >
              <UploadCloud size={18} />
            </button>

            <button
              onClick={onShareFolderClick}
              className="p-2 rounded-lg bg-card border hover:bg-accent hover:text-blue-500 transition-colors shadow-sm flex items-center justify-center"
              title="Bagikan Folder Ini"
            >
              <Share2 size={18} />
            </button>

            <div className="w-px h-6 bg-border mx-1 hidden sm:block"></div>

            <button
              onClick={onDetailsClick}
              disabled={!activeFileId}
              className="p-2 rounded-lg bg-card border hover:bg-accent transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              title="Lihat Detail"
            >
              <Info size={18} />
            </button>

            <button
              onClick={onToggleBulkMode}
              className={cn(
                "p-2 rounded-lg border transition-colors shadow-sm flex items-center justify-center",
                isBulkMode
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-card hover:bg-accent border-border",
              )}
              title="Pilih Beberapa File"
            >
              <CheckSquare size={18} />
            </button>
          </div>
        )}

        <div className="flex items-center border border-border rounded-lg p-1 bg-muted/30 shrink-0 ml-auto">
          {view === "list" && (
            <button
              onClick={() =>
                setDensity(density === "compact" ? "comfortable" : "compact")
              }
              className={cn(
                "p-1.5 rounded-md transition-all mr-1",
                "text-muted-foreground hover:text-foreground hover:bg-background",
              )}
              title={density === "compact" ? "Mode Nyaman" : "Mode Kompak"}
            >
              {density === "compact" ? (
                <StretchHorizontal size={18} />
              ) : (
                <AlignJustify size={18} />
              )}
            </button>
          )}
          <div className="w-px h-4 bg-border mx-1"></div>
          <button
            onClick={() => onSetView("list")}
            className={cn(
              "p-1.5 rounded-md transition-all",
              view === "list"
                ? "bg-background text-primary shadow-sm scale-105"
                : "text-muted-foreground hover:text-foreground",
            )}
            title="Tampilan Daftar"
          >
            <List size={18} />
          </button>
          <button
            onClick={() => onSetView("grid")}
            className={cn(
              "p-1.5 rounded-md transition-all",
              view === "grid"
                ? "bg-background text-primary shadow-sm scale-105"
                : "text-muted-foreground hover:text-foreground",
            )}
            title="Tampilan Grid"
          >
            <Grid size={18} />
          </button>
          <button
            onClick={() => onSetView("gallery")}
            className={cn(
              "p-1.5 rounded-md transition-all",
              view === "gallery"
                ? "bg-background text-primary shadow-sm scale-105"
                : "text-muted-foreground hover:text-foreground",
            )}
            title="Tampilan Galeri"
          >
            <LayoutTemplate size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

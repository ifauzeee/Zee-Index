import React from "react";
import {
  Share2,
  Upload,
  CheckSquare,
  List,
  Grid,
  Info,
  LayoutTemplate,
  UploadCloud,
} from "lucide-react";
import { cn } from "@/lib/utils";

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
  return (
    <div className="flex justify-between items-center py-4 overflow-x-hidden">
      <nav className="flex items-center space-x-2 text-sm text-muted-foreground overflow-x-auto whitespace-nowrap">
        {history.map((folder, index) => (
          <span key={folder.id} className="flex items-center">
            <button
              onClick={() => onBreadcrumbClick(folder.id)}
              onDragOver={(e) => onBreadcrumbDragOver(e, folder.id)}
              onDragLeave={onBreadcrumbDragLeave}
              onDrop={(e) => onBreadcrumbDrop(e, folder)}
              className={cn(
                "transition-colors rounded-md p-1",
                shareToken && index === 0
                  ? "cursor-default text-muted-foreground"
                  : "hover:text-primary hover:bg-accent",
                dragOverBreadcrumb === folder.id &&
                  "bg-primary/20 text-primary",
              )}
            >
              {folder.name}
            </button>
            {index < history.length - 1 && <span className="mx-2">/</span>}
          </span>
        ))}
      </nav>

      <div className="flex items-center gap-2 shrink-0">
        {!shareToken && isAdmin && (
          <>
            <button
              onClick={onUploadClick}
              className="p-2 rounded-lg hover:bg-accent flex items-center justify-center text-sm gap-2 text-foreground"
              title="Upload atau Buat Folder"
            >
              <Upload size={18} />
            </button>

            <button
              onClick={onRequestFileClick}
              className="p-2 rounded-lg hover:bg-accent flex items-center justify-center text-sm gap-2 text-foreground"
              title="Buat Link Terima File"
            >
              <UploadCloud size={18} />
            </button>

            <button
              onClick={onShareFolderClick}
              className="p-2 rounded-lg hover:bg-accent flex items-center justify-center text-sm gap-2 text-foreground"
              title="Bagikan Folder Ini"
            >
              <Share2 size={18} />
            </button>
            <button
              onClick={onDetailsClick}
              disabled={!activeFileId}
              className="p-2 rounded-lg hover:bg-accent flex items-center justify-center text-sm gap-2 text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
              title="Lihat Detail"
            >
              <Info size={18} />
            </button>
            <button
              onClick={onToggleBulkMode}
              className={`p-2 rounded-lg transition-colors flex items-center justify-center text-sm ${
                isBulkMode
                  ? "bg-blue-600 text-white"
                  : "bg-transparent hover:bg-accent text-foreground"
              }`}
              title="Pilih Beberapa File"
            >
              <CheckSquare size={18} />
            </button>
          </>
        )}
        <div className="flex items-center border border-border rounded-lg p-0.5 bg-card/50">
          <button
            onClick={() => onSetView("list")}
            className={`p-1.5 rounded-md transition-colors ${
              view === "list"
                ? "bg-background text-primary shadow-sm"
                : "hover:bg-accent/50 text-muted-foreground"
            }`}
            title="Tampilan Daftar"
          >
            <List size={18} />
          </button>
          <button
            onClick={() => onSetView("grid")}
            className={`p-1.5 rounded-md transition-colors ${
              view === "grid"
                ? "bg-background text-primary shadow-sm"
                : "hover:bg-accent/50 text-muted-foreground"
            }`}
            title="Tampilan Grid"
          >
            <Grid size={18} />
          </button>
          <button
            onClick={() => onSetView("gallery")}
            className={`p-1.5 rounded-md transition-colors ${
              view === "gallery"
                ? "bg-background text-primary shadow-sm"
                : "hover:bg-accent/50 text-muted-foreground"
            }`}
            title="Tampilan Galeri"
          >
            <LayoutTemplate size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

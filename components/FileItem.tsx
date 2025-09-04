// components/FileItem.tsx
import type { DriveFile } from "@/lib/googleDrive";
import { useAppStore } from '@/lib/store';
import { formatBytes, getIcon, cn } from '@/lib/utils';
import React from 'react';
import { motion, Variants } from 'framer-motion';
import Image from 'next/image';
import { Lock } from 'lucide-react';

interface FileItemProps {
  file: DriveFile;
  onClick: () => void;
  onContextMenu: (e: React.MouseEvent<HTMLDivElement>) => void;
  isSelected: boolean;
  isBulkMode: boolean;
}

export default function FileItem({ file, onClick, onContextMenu, isSelected, isBulkMode }: FileItemProps) {
  const { view } = useAppStore();
  const Icon = getIcon(file.mimeType);

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: { 
      opacity: 1, 
      y: 0, 
      scale: 1, 
      transition: { duration: 0.3, ease: [0.2, 0, 0.2, 1] }
    },
    hover: { 
      scale: 1.02, 
      transition: { duration: 0.2 } 
    },
  };

  return (
    <motion.div
      variants={itemVariants}
      initial="hidden"
      animate="visible"
      whileHover="hover"
      className={cn(
        "relative rounded-lg transition-all duration-200 ease-out cursor-pointer",
        isSelected && "bg-accent/80 ring-2 ring-primary",
        view === "list"
          ? "flex items-center p-3 bg-card border border-border shadow-sm hover:shadow-md hover:bg-accent/50"
          : "flex flex-col items-center justify-center text-center p-4 bg-card border border-border shadow-sm hover:shadow-md w-full max-w-[160px] sm:max-w-[200px]"
      )}
      onClick={onClick}
      onContextMenu={onContextMenu}
    >
      <div
        className={cn(
          "flex w-full",
          view === "list" 
            ? "items-center gap-4" 
            : "flex-col items-center justify-center gap-2"
        )}
      >
        <div className="relative">
          {view === "grid" && file.thumbnailLink && !file.isFolder ? (
            <div className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-md overflow-hidden flex items-center justify-center">
              <Image
                src={file.thumbnailLink}
                alt={file.name}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 96px, 128px"
                priority={false}
              />
            </div>
          ) : (
            <div className={cn("text-3xl text-primary shrink-0 flex items-center justify-center", view === "grid" && "text-4xl mb-2")}>
              {React.createElement(Icon, { size: view === "grid" ? 48 : 28 })}
            </div>
          )}

          {/* --- IKON GEMBOK BARU UNTUK TAMPILAN GRID --- */}
          {view === 'grid' && file.isProtected && (
            <div className="absolute -bottom-1 -right-1 flex items-center justify-center p-1.5 bg-background/60 backdrop-blur-sm rounded-full ring-2 ring-background/20">
              <Lock size={12} className="text-primary" />
            </div>
          )}
        </div>

        <div
          className={cn(
            "flex-1 min-w-0",
            view === "grid" && "mt-2 max-w-[140px] sm:max-w-[180px] text-center"
          )}
        >
          <p
            className={cn(
              "font-medium truncate flex items-center gap-1.5",
              view === "list" ? "text-sm justify-start" : "text-xs sm:text-sm justify-center"
            )}
            title={file.name}
          >
            {view === 'list' && file.isProtected && <Lock size={12} className="text-muted-foreground shrink-0" />}
            <span className="truncate max-w-[120px] sm:max-w-[160px]">{file.name}</span>
          </p>
          
          {view === "list" && !file.isFolder && (
            <p className="text-xs text-muted-foreground mt-1 text-left">
              {file.size ? formatBytes(parseInt(file.size)) : "-"} •{" "}
              {new Date(file.modifiedTime).toLocaleDateString("id-ID", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </p>
          )}
          {view === "grid" && !file.isFolder && (
            <p className="text-xs text-muted-foreground mt-1 text-center">
              {file.size ? formatBytes(parseInt(file.size)) : "-"}
            </p>
          )}
        </div>

        {isBulkMode && (
           <input
            type="checkbox"
            checked={isSelected}
            readOnly
            className={cn(
              "absolute h-5 w-5 pointer-events-none",
              view === "list" ? "right-4 top-1/2 -translate-y-1/2" : "top-2 right-2",
              "rounded border-primary text-primary focus:ring-primary"
            )}
            onClick={(e) => e.stopPropagation()}
           />
        )}
      </div>
    </motion.div>
  );
}
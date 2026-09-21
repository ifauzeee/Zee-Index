"use client";

import React from "react";
import Image from "next/image";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import type { DriveFile } from "@/lib/drive";

interface FileItemThumbnailProps {
  file: Pick<DriveFile, "name" | "isFolder" | "isProtected">;
  isGallery: boolean;
  thumbnailSrc?: string;
  hasImage: boolean;
  isImageLoading: boolean;
  setImageLoading: (v: boolean) => void;
  setImageError: (v: boolean) => void;
  isNavigating?: boolean;
  compactClass?: boolean;
  Icon: LucideIcon;
}

const FileItemThumbnail: React.FC<FileItemThumbnailProps> = ({
  file,
  isGallery,
  thumbnailSrc,
  hasImage,
  isImageLoading,
  setImageLoading,
  setImageError,
  isNavigating,
  compactClass,
  Icon,
}) => {
  if (isGallery && hasImage && thumbnailSrc) {
    return (
      <div className="relative w-full bg-muted/20">
        {isImageLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/30 z-10">
            <Icon size={32} className="opacity-20" />
          </div>
        )}
        <Image
          src={thumbnailSrc}
          alt={file.name}
          width={0}
          height={0}
          sizes="100vw"
          style={{ width: "100%", height: "auto" }}
          className={cn(
            "object-cover block transition-opacity duration-200 select-none",
            isImageLoading ? "opacity-0" : "opacity-100",
          )}
          loading="lazy"
          decoding="async"
          onLoad={() => setImageLoading(false)}
          onError={() => {
            setImageLoading(false);
            setImageError(true);
          }}
          unoptimized
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "text-3xl text-primary shrink-0 flex items-center justify-center select-none",
        isGallery && "py-8 text-6xl bg-accent/10 w-full flex flex-col gap-2",
      )}
    >
      {isNavigating ? (
        <Loader2
          size={isGallery ? 64 : compactClass ? 20 : 28}
          className="animate-spin text-primary"
        />
      ) : (
        React.createElement(Icon, {
          size: isGallery ? 64 : compactClass ? 20 : 28,
        })
      )}
    </div>
  );
};

export default FileItemThumbnail;

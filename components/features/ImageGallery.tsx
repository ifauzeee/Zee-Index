"use client";

import * as React from "react";
import Lightbox from "yet-another-react-lightbox";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import Download from "yet-another-react-lightbox/plugins/download";
import Counter from "yet-another-react-lightbox/plugins/counter";
import "yet-another-react-lightbox/styles.css";
import "yet-another-react-lightbox/plugins/counter.css";
import { useAppStore } from "@/lib/store";
import type { DriveFile } from "@/lib/drive";

interface ImageGalleryProps {
  images: DriveFile[];
  initialIndex: number;
  isOpen: boolean;
  onClose: () => void;
}

export default function ImageGallery({
  images,
  initialIndex,
  isOpen,
  onClose,
}: ImageGalleryProps) {
  const { shareToken, folderTokens } = useAppStore();

  const slides = images.map((file) => {
    let src = `/api/download?fileId=${file.id}`;
    if (shareToken) {
      src += `&share_token=${shareToken}`;
    }
    const parentId = file.parents?.[0];
    if (parentId && folderTokens[parentId]) {
      src += `&access_token=${folderTokens[parentId]}`;
    }

    return {
      src,
      alt: file.name,
      title: file.name,
      downloadUrl: src,
      width: file.imageMediaMetadata?.width,
      height: file.imageMediaMetadata?.height,
    };
  });

  return (
    <Lightbox
      open={isOpen}
      close={onClose}
      index={initialIndex}
      slides={slides}
      plugins={[Zoom, Download, Counter]}
      animation={{ fade: 300 }}
      zoom={{
        maxZoomPixelRatio: 3,
        scrollToZoom: true,
      }}
      controller={{
        closeOnBackdropClick: true,
      }}
      styles={{
        container: { backgroundColor: "rgba(0, 0, 0, 0.9)" },
      }}
    />
  );
}

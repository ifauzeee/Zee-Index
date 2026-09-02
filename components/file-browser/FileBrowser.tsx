"use client";

import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import FileBrowserHeader from "@/components/file-browser/FileBrowserHeader";
const ImageGallery = dynamic(
  () => import("@/components/features/ImageGallery"),
  {
    ssr: false,
  },
);
import FileBrowserModals from "@/components/file-browser/FileBrowserModals";
import FileBrowserContent from "@/components/file-browser/FileBrowserContent";
import FileUploadManager from "@/components/file-browser/FileUploadManager";
import {
  useFileBrowserController,
  type FileBrowserProps,
} from "@/components/file-browser/useFileBrowserController";

export default function FileBrowser(props: FileBrowserProps) {
  const {
    rootProps,
    shouldShowHeader,
    headerProps,
    contentProps,
    modalsProps,
    galleryProps,
  } = useFileBrowserController(props);

  return (
    <motion.div className="relative flex flex-col gap-6" {...rootProps}>
      {shouldShowHeader && <FileBrowserHeader {...headerProps} />}

      <div>
        <FileBrowserContent {...contentProps} />
      </div>

      <FileBrowserModals {...modalsProps} />
      <FileUploadManager />
      <ImageGallery {...galleryProps} />
    </motion.div>
  );
}

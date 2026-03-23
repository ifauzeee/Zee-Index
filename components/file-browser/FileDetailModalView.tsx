"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  Eye,
  Info,
  X,
} from "lucide-react";

interface FileDetailModalViewProps {
  previewContent: React.ReactNode;
  prevFileUrl?: string;
  nextFileUrl?: string;
  onClose?: () => void;
  isTextPreviewable: boolean;
  showTextPreview: boolean;
  onShowTextPreview: () => void;
  isDocPreviewable: boolean;
  showDocPreview: boolean;
  onShowDocPreview: () => void;
  showMobileInfo: boolean;
  onShowMobileInfo: () => void;
  onHideMobileInfo: () => void;
  mobileInfoPanel: React.ReactNode;
}

export default function FileDetailModalView({
  previewContent,
  prevFileUrl,
  nextFileUrl,
  onClose,
  isTextPreviewable,
  showTextPreview,
  onShowTextPreview,
  isDocPreviewable,
  showDocPreview,
  onShowDocPreview,
  showMobileInfo,
  onShowMobileInfo,
  onHideMobileInfo,
  mobileInfoPanel,
}: FileDetailModalViewProps) {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black text-white h-full w-full animate-in fade-in">
      <div className="absolute top-0 left-0 right-0 z-20 flex justify-between p-4 bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
        <button
          onClick={onClose}
          className="pointer-events-auto p-2 bg-black/40 rounded-full hover:bg-white/20"
        >
          <X size={20} />
        </button>
        <div className="flex gap-3 pointer-events-auto">
          {isTextPreviewable && !showTextPreview && (
            <button
              onClick={onShowTextPreview}
              className="p-2 bg-black/40 rounded-full"
            >
              <Eye size={20} />
            </button>
          )}
          {isDocPreviewable && !showDocPreview && (
            <button
              onClick={onShowDocPreview}
              className="p-2 bg-black/40 rounded-full"
            >
              <FileText size={20} />
            </button>
          )}
          <button
            onClick={onShowMobileInfo}
            className="p-2 bg-black/40 rounded-full hover:bg-white/20"
          >
            <Info size={20} />
          </button>
        </div>
      </div>

      <div className="flex-1 relative flex items-center justify-center w-full h-full">
        {prevFileUrl && (
          <Link
            href={prevFileUrl}
            className="absolute left-2 md:left-4 z-10 p-3 bg-black/30 backdrop-blur-sm rounded-full hover:bg-white/20"
          >
            <ChevronLeft size={24} />
          </Link>
        )}
        <div className="w-full h-full flex items-center justify-center">
          {previewContent}
        </div>
        {nextFileUrl && (
          <Link
            href={nextFileUrl}
            className="absolute right-2 md:right-4 z-10 p-3 bg-black/30 backdrop-blur-sm rounded-full hover:bg-white/20"
          >
            <ChevronRight size={24} />
          </Link>
        )}
      </div>

      <AnimatePresence>
        {showMobileInfo && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-30"
              onClick={onHideMobileInfo}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="fixed bottom-0 z-40 w-full bg-zinc-900 rounded-t-2xl max-h-[80vh] overflow-y-auto p-4"
            >
              <div className="w-12 h-1.5 bg-zinc-700 rounded-full mx-auto mb-6" />
              {mobileInfoPanel}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  motion,
  PanInfo,
  useAnimation,
  AnimatePresence,
  Variants,
} from "framer-motion";
import {
  X,
  Plus,
  Tag as TagIcon,
  ExternalLink,
  Download,
  Link as LinkIcon,
  Calendar,
  HardDrive,
  FileType,
  User,
  Hash,
  Clock,
  Maximize2,
  Edit3,
  History,
  FileBox,
} from "lucide-react";
import type { DriveFile } from "@/lib/googleDrive";
import {
  formatBytes,
  formatDuration,
  getIcon,
  getGoogleEditorLink,
  getGoogleDriveLink,
  cn,
} from "@/lib/utils";
import { renderToString } from "react-dom/server";
import Image from "next/image";
import { useAppStore } from "@/lib/store";

interface DetailsPanelProps {
  file: DriveFile;
  onClose: () => void;
}

const panelVariants: Variants = {
  hidden: (isMobile: boolean) => ({
    x: isMobile ? 0 : "100%",
    y: isMobile ? "100%" : 0,
    opacity: 0,
  }),
  visible: {
    x: 0,
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      damping: 40,
      stiffness: 400,
      mass: 0.8,
    },
  },
  exit: (isMobile: boolean) => ({
    x: isMobile ? 0 : "100%",
    y: isMobile ? "100%" : 0,
    opacity: 0,
    transition: {
      type: "spring",
      damping: 40,
      stiffness: 400,
      mass: 0.8,
    },
  }),
};

const contentVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 20,
    },
  },
};

const QuickStat = ({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
}) => (
  <motion.div
    variants={itemVariants}
    className="relative flex flex-col gap-1.5 p-4 rounded-2xl bg-secondary/30 border border-border/50 overflow-hidden group hover:bg-secondary/50 transition-colors"
  >
    <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all duration-500">
      <Icon size={48} />
    </div>
    <div className="flex items-center gap-2 text-muted-foreground z-10">
      <Icon size={14} strokeWidth={2.5} />
      <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">
        {label}
      </span>
    </div>
    <span className="text-sm font-semibold truncate z-10 text-foreground">
      {value}
    </span>
  </motion.div>
);

const DetailRow = ({
  icon: Icon,
  label,
  value,
  copyable = false,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  copyable?: boolean;
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!copyable) return;
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      variants={itemVariants}
      onClick={handleCopy}
      className={cn(
        "flex items-center justify-between py-3 px-2 border-b border-border/40 last:border-0 group rounded-lg transition-colors",
        copyable && "cursor-pointer hover:bg-muted/40",
      )}
    >
      <div className="flex items-center gap-3 text-muted-foreground">
        <div className="p-2 rounded-lg bg-secondary/50 group-hover:bg-background transition-colors">
          <Icon size={16} />
        </div>
        <span className="text-sm font-medium">{label}</span>
      </div>
      <span
        className={cn(
          "text-sm font-medium text-right break-all max-w-[55%]",
          copied ? "text-green-500" : "text-foreground/90",
        )}
      >
        {copied ? "Disalin!" : value}
      </span>
    </motion.div>
  );
};

export default function DetailsPanel({ file, onClose }: DetailsPanelProps) {
  const FileIconComponent = getIcon(file.mimeType);
  const metadata = file.imageMediaMetadata || file.videoMediaMetadata;
  const durationMillis = file.videoMediaMetadata?.durationMillis
    ? parseInt(file.videoMediaMetadata.durationMillis, 10)
    : undefined;

  const { user, hideAuthor, fileTags, fetchTags, addTag, removeTag, addToast } =
    useAppStore();

  const [newTag, setNewTag] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const controls = useAnimation();
  const headerRef = useRef<HTMLDivElement>(null);

  const isAdmin = user?.role === "ADMIN";
  const canShowAuthor = isAdmin || !hideAuthor;

  const editorLink = getGoogleEditorLink(file.id, file.mimeType);
  const driveViewerLink = getGoogleDriveLink(file.id);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    document.body.style.overflow = "hidden";

    fetchTags(file.id);

    return () => {
      window.removeEventListener("resize", checkMobile);
      document.body.style.overflow = "";
    };
  }, [file.id, fetchTags]);

  const handleAddTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newTag.trim()) {
      await addTag(file.id, newTag.trim());
      setNewTag("");
    }
  };

  const handleCopyLink = () => {
    const url = `/api/download?fileId=${file.id}`;
    navigator.clipboard.writeText(`${window.location.origin}${url}`);
    addToast({ message: "Link download disalin!", type: "success" });
  };

  const onDragEnd = async (
    event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo,
  ) => {
    const threshold = 100;
    const velocity = 300;

    if (isMobile) {
      if (info.offset.y > threshold || info.velocity.y > velocity) {
        onClose();
      } else {
        controls.start({ y: 0 });
      }
    } else {
      if (info.offset.x > threshold || info.velocity.x > velocity) {
        onClose();
      } else {
        controls.start({ x: 0 });
      }
    }
  };

  const iconString = renderToString(
    <FileIconComponent size={80} className="text-foreground/20" />,
  );

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[60] lg:z-40"
        onClick={onClose}
      />

      <motion.div
        custom={isMobile}
        variants={panelVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        drag={isMobile ? "y" : "x"}
        dragConstraints={isMobile ? { top: 0 } : { left: 0 }}
        dragElastic={0.1}
        onDragEnd={onDragEnd}
        className={cn(
          "fixed z-[61] lg:z-50 bg-background/85 backdrop-blur-xl border-border shadow-2xl flex flex-col",
          "bottom-0 left-0 right-0 w-full h-[90vh] rounded-t-[2rem] border-t",
          "lg:top-0 lg:right-0 lg:bottom-0 lg:left-auto lg:w-[450px] lg:h-full lg:rounded-none lg:border-l lg:border-t-0",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="lg:hidden w-full flex justify-center pt-3 pb-1 shrink-0 cursor-grab active:cursor-grabbing">
          <div className="w-12 h-1.5 bg-muted-foreground/20 rounded-full" />
        </div>

        <div
          ref={headerRef}
          className="flex items-center justify-between px-6 py-5 border-b border-border/40 shrink-0 select-none"
        >
          <div className="flex items-center gap-3">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="p-2.5 bg-primary/10 rounded-xl text-primary"
            >
              <FileBox size={20} />
            </motion.div>
            <h2 className="font-bold text-lg tracking-tight">Detail File</h2>
          </div>
          <motion.button
            whileHover={{ scale: 1.1, rotate: 90 }}
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            className="p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={20} />
          </motion.button>
        </div>

        <motion.div
          variants={contentVariants}
          initial="hidden"
          animate="visible"
          className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar pb-24 lg:pb-8"
        >
          <motion.div
            variants={itemVariants}
            className="flex flex-col items-center gap-6 pt-2"
          >
            <div className="relative group">
              <div className="absolute -inset-6 bg-primary/20 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

              <motion.div
                whileHover={{ scale: 1.02, rotate: 1 }}
                transition={{ type: "spring", stiffness: 300 }}
                className="relative w-40 h-40 sm:w-48 sm:h-48 rounded-[2rem] shadow-2xl bg-card border border-border/50 flex items-center justify-center overflow-hidden z-10"
              >
                {file.thumbnailLink && !file.isFolder ? (
                  <Image
                    src={file.thumbnailLink.replace("=s220", "=s800")}
                    alt={file.name}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                    unoptimized
                  />
                ) : (
                  <div dangerouslySetInnerHTML={{ __html: iconString }} />
                )}
              </motion.div>
            </div>

            <div className="text-center w-full px-2 space-y-2">
              <motion.h3
                layout
                className="font-bold text-xl leading-snug break-words select-all"
                title={file.name}
              >
                {file.name}
              </motion.h3>
              <span className="text-xs font-medium text-muted-foreground font-mono bg-muted/50 px-3 py-1 rounded-full inline-block border border-border/50">
                {file.mimeType}
              </span>
            </div>
          </motion.div>

          <motion.div
            variants={itemVariants}
            className="grid grid-cols-2 gap-3"
          >
            <motion.a
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              href={editorLink || driveViewerLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-primary/5 text-primary font-semibold text-sm hover:bg-primary/10 transition-colors border border-primary/10"
            >
              <ExternalLink size={20} />
              {editorLink ? "Edit File" : "Buka Drive"}
            </motion.a>
            <motion.a
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              href={`/api/download?fileId=${file.id}`}
              download
              className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-secondary text-secondary-foreground font-semibold text-sm hover:bg-secondary/80 transition-colors border border-border/50"
            >
              <Download size={20} />
              Unduh
            </motion.a>
          </motion.div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <QuickStat
              icon={HardDrive}
              label="Ukuran"
              value={file.size ? formatBytes(Number(file.size)) : "-"}
            />
            {metadata?.width && (
              <QuickStat
                icon={Maximize2}
                label="Dimensi"
                value={`${metadata.width} x ${metadata.height}`}
              />
            )}
            {durationMillis && (
              <QuickStat
                icon={Clock}
                label="Durasi"
                value={formatDuration(durationMillis / 1000)}
              />
            )}
            <QuickStat
              icon={FileType}
              label="Ekstensi"
              value={file.name.split(".").pop()?.toUpperCase() || "FILE"}
            />
          </div>

          <motion.div
            variants={itemVariants}
            className="space-y-4 bg-card/30 rounded-2xl p-2 border border-border/30"
          >
            <div className="flex items-center gap-2 px-2 pb-2 border-b border-border/30">
              <History size={16} className="text-primary" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Properti File
              </h4>
            </div>
            <div className="px-1 flex flex-col">
              <DetailRow
                icon={Calendar}
                label="Diubah"
                value={new Date(file.modifiedTime).toLocaleString("id-ID", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              />
              <DetailRow
                icon={Calendar}
                label="Dibuat"
                value={new Date(file.createdTime).toLocaleString("id-ID", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              />
              {canShowAuthor && file.owners?.[0] && (
                <DetailRow
                  icon={User}
                  label="Pemilik"
                  value={file.owners[0].displayName}
                />
              )}
              {canShowAuthor && file.lastModifyingUser && (
                <DetailRow
                  icon={Edit3}
                  label="Editor"
                  value={file.lastModifyingUser.displayName}
                />
              )}
              {file.md5Checksum && (
                <div className="pt-4 px-2">
                  <div className="flex items-center gap-2 mb-2 text-muted-foreground">
                    <Hash size={14} />
                    <span className="text-xs font-bold uppercase">
                      MD5 Checksum
                    </span>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-xl border border-border/50 font-mono text-[10px] break-all select-all text-muted-foreground hover:text-foreground transition-colors cursor-text hover:bg-muted">
                    {file.md5Checksum}
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h4 className="text-xs font-bold flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
                <TagIcon size={14} /> Label
              </h4>
            </div>
            <div className="flex flex-wrap gap-2">
              <AnimatePresence>
                {fileTags[file.id]?.map((tag) => (
                  <motion.span
                    key={tag}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold border border-primary/20 hover:bg-primary/20 transition-colors"
                  >
                    {tag}
                    {isAdmin && (
                      <button
                        onClick={() => removeTag(file.id, tag)}
                        className="hover:bg-primary/20 rounded-full p-0.5 transition-colors"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </motion.span>
                ))}
              </AnimatePresence>

              {isAdmin && (
                <form
                  onSubmit={handleAddTag}
                  className="flex items-center bg-muted/50 rounded-full px-3 py-1.5 border border-transparent focus-within:border-primary/50 focus-within:bg-background transition-all group"
                >
                  <Plus
                    size={14}
                    className="text-muted-foreground mr-2 group-focus-within:text-primary transition-colors"
                  />
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="Tag baru..."
                    className="bg-transparent text-xs outline-none w-24 placeholder:text-muted-foreground/50"
                  />
                </form>
              )}
            </div>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1, transition: { delay: 0.3 } }}
          className="p-6 border-t border-border/40 bg-background/50 backdrop-blur-md"
        >
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleCopyLink}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-foreground text-background hover:bg-foreground/90 font-bold text-sm shadow-xl shadow-foreground/5 transition-all"
          >
            <LinkIcon size={18} />
            Salin Link Langsung
          </motion.button>
        </motion.div>
      </motion.div>
    </>
  );
}

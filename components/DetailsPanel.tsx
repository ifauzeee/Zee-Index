"use client";

import { motion, useAnimation, PanInfo } from "framer-motion";
import { X, Plus, Tag as TagIcon, ExternalLink } from "lucide-react";
import type { DriveFile } from "@/lib/googleDrive";
import {
  formatBytes,
  formatDuration,
  getIcon,
  getGoogleEditorLink,
  getGoogleDriveLink,
} from "@/lib/utils";
import { renderToString } from "react-dom/server";
import Image from "next/image";
import React, { useState, useEffect } from "react";
import { useAppStore } from "@/lib/store";

interface DetailsPanelProps {
  file: DriveFile;
  onClose: () => void;
}

const ListItem = ({ label, value }: { label: string; value: string }) => (
  <li className="flex justify-between items-start gap-4 py-1">
    <span className="font-medium text-muted-foreground text-sm">{label}</span>
    <span className="text-right break-all text-sm font-medium">{value}</span>
  </li>
);

export default function DetailsPanel({ file, onClose }: DetailsPanelProps) {
  const Icon = getIcon(file.mimeType);
  const metadata = file.imageMediaMetadata || file.videoMediaMetadata;
  const durationMillis = file.videoMediaMetadata?.durationMillis
    ? parseInt(file.videoMediaMetadata.durationMillis, 10)
    : undefined;
  const { user, hideAuthor, fileTags, fetchTags, addTag, removeTag } =
    useAppStore();

  const [newTag, setNewTag] = useState("");
  const [isAddingTag, setIsAddingTag] = useState(false);
  const controls = useAnimation();

  const isAdmin = user?.role === "ADMIN";
  const canShowAuthor = isAdmin || !hideAuthor;

  const editorLink = getGoogleEditorLink(file.id, file.mimeType);
  const driveViewerLink = getGoogleDriveLink(file.id);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    fetchTags(file.id);
  }, [file.id, fetchTags]);

  const handleAddTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newTag.trim()) {
      setIsAddingTag(true);
      await addTag(file.id, newTag.trim());
      setNewTag("");
      setIsAddingTag(false);
    }
  };

  const iconString = renderToString(
    <Icon size={128} className="text-primary/20" />,
  );

  const onDragEnd = async (
    event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo,
  ) => {
    if (info.offset.y > 150) {
      await controls.start({ y: "100%" });
      onClose();
    } else {
      controls.start({ y: 0 });
    }
  };

  return (
    <motion.div
      className="fixed inset-0 bg-black/60 z-[60] lg:z-40 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="fixed bottom-0 left-0 right-0 w-full h-[92vh] lg:h-full lg:max-h-full lg:w-full lg:max-w-sm lg:right-0 lg:top-0 lg:border-l bg-background rounded-t-2xl lg:rounded-none shadow-2xl flex flex-col overflow-hidden"
        initial={window.innerWidth < 1024 ? { y: "100%" } : { x: "100%" }}
        animate={window.innerWidth < 1024 ? { y: 0 } : { x: 0 }}
        exit={window.innerWidth < 1024 ? { y: "100%" } : { x: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        drag={window.innerWidth < 1024 ? "y" : false}
        dragConstraints={{ top: 0 }}
        dragElastic={0.05}
        onDragEnd={onDragEnd}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-full flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing lg:hidden bg-background z-10 shrink-0">
          <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full" />
        </div>

        <header className="flex items-center justify-between px-6 py-4 border-b shrink-0 bg-background z-10">
          <h3 className="text-lg font-bold truncate pr-4">Detail Item</h3>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-muted/50 hover:bg-muted text-foreground transition-colors"
          >
            <X size={20} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 space-y-8 no-scrollbar pb-safe">
          <div className="flex flex-col items-center justify-center py-4">
            <div className="relative shadow-lg rounded-2xl overflow-hidden bg-muted/10">
              {file.thumbnailLink && !file.isFolder ? (
                <Image
                  src={file.thumbnailLink.replace("=s220", "=s800")}
                  alt={file.name}
                  width={200}
                  height={200}
                  className="object-cover w-48 h-48 sm:w-64 sm:h-64"
                  unoptimized
                />
              ) : (
                <div
                  className="w-48 h-48 flex items-center justify-center bg-muted/20"
                  dangerouslySetInnerHTML={{ __html: iconString }}
                />
              )}
            </div>
            <p
              className="text-center font-bold mt-4 text-lg break-words w-full px-4 leading-snug"
              title={file.name}
            >
              {file.name}
            </p>
          </div>

          <div className="px-2">
            {editorLink ? (
              <a
                href={editorLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all font-semibold shadow-sm active:scale-95"
              >
                <ExternalLink size={18} /> Buka di Google Docs
              </a>
            ) : (
              <a
                href={driveViewerLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3.5 bg-secondary text-secondary-foreground rounded-xl hover:bg-secondary/80 transition-all font-semibold shadow-sm active:scale-95"
              >
                <ExternalLink size={18} /> Buka di Google Drive
              </a>
            )}
          </div>

          <div className="space-y-3 bg-card border rounded-xl p-4 shadow-sm">
            <h4 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
              <TagIcon size={14} /> Tags
            </h4>
            <div className="flex flex-wrap gap-2">
              {fileTags[file.id]?.length > 0 ? (
                fileTags[file.id]?.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium"
                  >
                    {tag}
                    {isAdmin && (
                      <button
                        onClick={() => removeTag(file.id, tag)}
                        className="hover:text-destructive/80 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </span>
                ))
              ) : (
                <span className="text-sm text-muted-foreground italic">
                  Tidak ada tag
                </span>
              )}
            </div>
            {isAdmin && (
              <form onSubmit={handleAddTag} className="flex gap-2 mt-2">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Tambah tag..."
                  className="flex-1 px-3 py-2 text-sm rounded-lg border bg-transparent focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <button
                  type="submit"
                  disabled={isAddingTag || !newTag.trim()}
                  className="p-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
                >
                  <Plus size={18} />
                </button>
              </form>
            )}
          </div>

          <div className="bg-card border rounded-xl p-4 shadow-sm space-y-1">
            <h4 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider border-b pb-2">
              Informasi File
            </h4>
            <ListItem
              label="Ukuran"
              value={file.size ? formatBytes(Number(file.size)) : "-"}
            />
            <ListItem label="Tipe" value={file.mimeType} />
            {metadata?.width && metadata?.height && (
              <ListItem
                label="Dimensi"
                value={`${metadata.width} x ${metadata.height} px`}
              />
            )}
            {durationMillis && (
              <ListItem
                label="Durasi"
                value={formatDuration(durationMillis / 1000)}
              />
            )}
            <ListItem
              label="Diubah"
              value={new Date(file.modifiedTime).toLocaleString("id-ID", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            />
            <ListItem
              label="Dibuat"
              value={new Date(file.createdTime).toLocaleString("id-ID", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            />
            {canShowAuthor && file.owners && file.owners.length > 0 && (
              <ListItem label="Pemilik" value={file.owners[0].displayName} />
            )}
            {canShowAuthor && file.lastModifyingUser && (
              <ListItem
                label="Diubah oleh"
                value={file.lastModifyingUser.displayName}
              />
            )}
            {file.md5Checksum && (
              <div className="pt-2 mt-2 border-t">
                <span className="block text-xs font-medium text-muted-foreground mb-1">
                  MD5 Checksum
                </span>
                <span className="block font-mono text-xs break-all bg-muted/50 p-2 rounded select-all text-muted-foreground">
                  {file.md5Checksum}
                </span>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

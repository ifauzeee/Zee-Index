"use client";

import { motion } from "framer-motion";
import { X } from "lucide-react";
import type { DriveFile } from "@/lib/googleDrive";
import { formatBytes, formatDuration, getIcon } from "@/lib/utils";
import { renderToString } from "react-dom/server";
import Image from "next/image";
import React from "react";
import { useAppStore } from "@/lib/store";

interface DetailsPanelProps {
  file: DriveFile;
  onClose: () => void;
}

const ListItem = ({ label, value }: { label: string; value: string }) => (
  <li className="flex justify-between items-start gap-4">
    <span className="font-medium text-muted-foreground">{label}</span>
    <span className="text-right break-all">{value}</span>
  </li>
);
export default function DetailsPanel({ file, onClose }: DetailsPanelProps) {
  const Icon = getIcon(file.mimeType);
  const metadata = file.imageMediaMetadata || file.videoMediaMetadata;
  const durationMillis = file.videoMediaMetadata?.durationMillis
    ? parseInt(file.videoMediaMetadata.durationMillis, 10)
    : undefined;

  const { user, hideAuthor } = useAppStore();
  const isAdmin = user?.role === "ADMIN";
  const canShowAuthor = isAdmin || !hideAuthor;

  const iconString = renderToString(
    <Icon size={128} className="text-primary/10" />,
  );
  return (
    <motion.div
      className="fixed inset-0 bg-black/60 z-40"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="fixed bottom-0 left-0 right-0 w-full max-h-[85vh] rounded-t-xl shadow-2xl flex flex-col bg-background
                   lg:absolute lg:right-0 lg:top-0 lg:h-full lg:max-h-full lg:w-full lg:max-w-sm lg:rounded-t-none lg:border-l"
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        variants={{
          initial: { y: "100%", x: "0%" },
          animate: { y: "0%", x: "0%" },
          exit: { y: "100%", x: "0%" },
          lgInitial: { x: "100%", y: "0%" },
          lgAnimate: { x: "0%", y: "0%" },
          lgExit: { x: "100%", y: "0%" },
        }}
        initial="initial"
        animate="animate"
        exit="exit"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute left-1/2 top-3 -translate-x-1/2 w-12 h-1.5 bg-muted rounded-full lg:hidden" />
        <header className="flex items-center justify-between p-4 pt-8 lg:pt-4 border-b">
          <h3 className="text-lg font-semibold">Detail Item</h3>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent"
          >
            <X size={20} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="flex flex-col items-center justify-center">
            {file.thumbnailLink && !file.isFolder ? (
              <Image
                src={file.thumbnailLink}
                alt={file.name}
                width={128}
                height={128}
                className="rounded-lg object-cover"
              />
            ) : (
              <div
                className="w-32 h-32 flex items-center justify-center"
                dangerouslySetInnerHTML={{ __html: iconString }}
              />
            )}
            <p
              className="text-center font-semibold mt-4 break-words w-full"
              title={file.name}
            >
              {file.name}
            </p>
          </div>

          <div className="space-y-3 text-sm text-foreground">
            <h4 className="text-base font-semibold mb-2 border-b pb-2">
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
                dateStyle: "long",
                timeStyle: "short",
              })}
            />
            <ListItem
              label="Dibuat"
              value={new Date(file.createdTime).toLocaleString("id-ID", {
                dateStyle: "long",
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
              <li className="flex flex-col justify-between items-start gap-2 pt-2 border-t border-border">
                <span className="font-medium text-muted-foreground shrink-0">
                  MD5
                </span>
                <span className="font-mono text-xs break-all text-left">
                  {file.md5Checksum}
                </span>
              </li>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

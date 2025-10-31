"use client";

import { motion } from "framer-motion";
import { X } from "lucide-react";
import type { DriveFile } from "@/lib/googleDrive";
import { formatBytes, formatDuration, getIcon } from "@/lib/utils";
import { renderToString } from "react-dom/server";
import Image from "next/image";
import React from "react";

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
        className="absolute right-0 top-0 h-full w-full max-w-sm bg-background border-l shadow-xl flex flex-col"
        initial={{ x: "100%" }}
        animate={{ x: "0%" }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between p-4 border-b">
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
            {file.owners && file.owners.length > 0 && (
              <ListItem label="Pemilik" value={file.owners[0].displayName} />
            )}
            {file.lastModifyingUser && (
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
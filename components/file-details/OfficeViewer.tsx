"use client";

import React from "react";
import { Download, ExternalLink } from "lucide-react";

interface OfficeViewerProps {
  fileId?: string;
  fileUrl?: string;
  mimeType?: string;
  src?: string;
}

function isGoogleDriveFileId(fileId?: string) {
  return !!fileId && !fileId.startsWith("local-storage:");
}

function toAbsoluteUrl(url: string) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  if (typeof window === "undefined") return url;
  return new URL(url, window.location.origin).toString();
}

function isExternallyFetchable(url: string) {
  try {
    const parsed = new URL(url);
    return !["localhost", "127.0.0.1", "::1", "0.0.0.0"].includes(
      parsed.hostname,
    );
  } catch {
    return false;
  }
}

export function OfficeViewer({
  fileId,
  fileUrl,
  mimeType,
  src,
}: OfficeViewerProps) {
  const officeMimes = [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/msword",
    "application/vnd.ms-excel",
    "application/vnd.ms-powerpoint",
  ];

  const url = toAbsoluteUrl(fileUrl || src || "");

  if (url && mimeType && !officeMimes.includes(mimeType)) return null;

  const canUseDrivePreview = isGoogleDriveFileId(fileId);
  const canUseOfficeOnline = isExternallyFetchable(url);
  const viewerUrl = canUseDrivePreview
    ? `https://drive.google.com/file/d/${encodeURIComponent(fileId!)}/preview`
    : canUseOfficeOnline
      ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`
      : "";

  if (!viewerUrl) {
    return (
      <div className="flex h-full min-h-[500px] flex-col items-center justify-center gap-4 rounded border border-white/10 bg-zinc-950 p-6 text-center text-zinc-300">
        <div className="max-w-md space-y-2">
          <h3 className="text-lg font-semibold text-white">
            Pratinjau Office tidak tersedia
          </h3>
          <p className="text-sm text-zinc-400">
            File Office dari URL lokal atau private tidak bisa dibuka oleh
            viewer eksternal.
          </p>
        </div>
        {url && (
          <a
            href={url}
            className="inline-flex items-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-medium text-zinc-950 transition hover:bg-zinc-200"
          >
            <Download size={16} />
            Unduh file
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="relative h-full min-h-[500px] w-full rounded border border-white/10 bg-white">
      <iframe
        src={viewerUrl}
        width="100%"
        height="100%"
        frameBorder="0"
        allowFullScreen
        title="Office Viewer"
      />
      {url && (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="absolute bottom-4 right-4 inline-flex items-center gap-2 rounded-md bg-zinc-950/85 px-3 py-2 text-xs font-medium text-white shadow-lg backdrop-blur transition hover:bg-zinc-900"
        >
          <ExternalLink size={14} />
          Buka file
        </a>
      )}
    </div>
  );
}

export default OfficeViewer;

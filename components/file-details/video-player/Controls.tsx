"use client";

import React from "react";
import { MonitorPlay, Copy, Play, ExternalLink, Tv } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ExternalPlayerMenuProps {
  getAbsoluteSrc: () => string;
  onCopyUrl: () => void;
}

export function ExternalPlayerMenu({
  getAbsoluteSrc,
  onCopyUrl,
}: ExternalPlayerMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="p-2 bg-black/40 hover:bg-black/80 text-white rounded-xl backdrop-blur-md border border-white/10 transition-all shadow-lg focus:outline-none"
          title="Stream Eksternal"
        >
          <MonitorPlay size={16} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-56 bg-zinc-950/90 border-white/10 text-white backdrop-blur-xl z-[100]"
      >
        <DropdownMenuLabel>External Player</DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-white/10" />

        <DropdownMenuItem
          className="cursor-pointer hover:bg-white/10 focus:bg-white/10 focus:text-white"
          onClick={onCopyUrl}
        >
          <Copy className="mr-2 h-4 w-4" /> Copy URL
        </DropdownMenuItem>

        <DropdownMenuItem
          className="cursor-pointer hover:bg-white/10 focus:bg-white/10 focus:text-white"
          onClick={() => (window.location.href = `vlc://${getAbsoluteSrc()}`)}
        >
          <Play className="mr-2 h-4 w-4" /> Open in VLC (PC)
        </DropdownMenuItem>

        <DropdownMenuItem
          className="cursor-pointer hover:bg-white/10 focus:bg-white/10 focus:text-white"
          onClick={() =>
            (window.location.href = `intent:${getAbsoluteSrc()}#Intent;package=org.videolan.vlc;type=video/*;scheme=https;end`)
          }
        >
          <Play className="mr-2 h-4 w-4" /> VLC (Android)
        </DropdownMenuItem>

        <DropdownMenuItem
          className="cursor-pointer hover:bg-white/10 focus:bg-white/10 focus:text-white"
          onClick={() =>
            (window.location.href = `intent:${getAbsoluteSrc()}#Intent;package=com.mxtech.videoplayer.ad;type=video/*;scheme=https;end`)
          }
        >
          <Play className="mr-2 h-4 w-4" /> MX Player (Free)
        </DropdownMenuItem>

        <DropdownMenuItem
          className="cursor-pointer hover:bg-white/10 focus:bg-white/10 focus:text-white"
          onClick={() =>
            (window.location.href = `intent:${getAbsoluteSrc()}#Intent;package=com.mxtech.videoplayer.pro;type=video/*;scheme=https;end`)
          }
        >
          <Play className="mr-2 h-4 w-4" /> MX Player (Pro)
        </DropdownMenuItem>

        <DropdownMenuItem
          className="cursor-pointer hover:bg-white/10 focus:bg-white/10 focus:text-white"
          onClick={() =>
            (window.location.href = `infuse://x-callback-url/play?url=${encodeURIComponent(
              getAbsoluteSrc(),
            )}`)
          }
        >
          <Play className="mr-2 h-4 w-4" /> Infuse (iOS/Mac)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface VideoControlsOverlayProps {
  controlsVisible: boolean;
  isMobile: boolean;
  isTheaterMode: boolean;
  webViewLink?: string;
  preventDownload?: boolean;
  getAbsoluteSrc: () => string;
  onCopyUrl: () => void;
  onToggleTheater: () => void;
}

export function VideoControlsOverlay({
  controlsVisible,
  isMobile,
  isTheaterMode,
  webViewLink,
  preventDownload,
  getAbsoluteSrc,
  onCopyUrl,
  onToggleTheater,
}: VideoControlsOverlayProps) {
  return (
    <div
      className={cn(
        "absolute top-4 right-4 flex flex-col items-end gap-3 z-20 transition-all duration-500",
        controlsVisible ? "opacity-100" : "opacity-0 pointer-events-none",
      )}
    >
      {!preventDownload && (
        <ExternalPlayerMenu
          getAbsoluteSrc={getAbsoluteSrc}
          onCopyUrl={onCopyUrl}
        />
      )}

      {webViewLink && !isMobile && (
        <a
          href={webViewLink}
          target="_blank"
          rel="noreferrer"
          data-prevent-nprogress="true"
          data-nprogress="off"
          className="p-2 bg-black/40 hover:bg-black/80 text-white rounded-xl backdrop-blur-md border border-white/10 transition-all shadow-lg"
          title="Buka original di Google Drive"
        >
          <ExternalLink size={16} />
        </a>
      )}

      {!isMobile && !preventDownload && (
        <button
          onClick={onToggleTheater}
          className={cn(
            "p-2 rounded-xl backdrop-blur-md border border-white/10 transition-all shadow-lg",
            isTheaterMode
              ? "bg-primary text-primary-foreground"
              : "bg-black/40 hover:bg-black/80 text-white",
          )}
          title="Theater Mode"
        >
          <Tv size={16} />
        </button>
      )}
    </div>
  );
}

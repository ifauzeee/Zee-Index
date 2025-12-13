"use client";

import React, { useRef, useState, useEffect } from "react";
import { MediaPlayer, MediaProvider, Track } from "@vidstack/react";
import type { MediaPlayerInstance, MediaErrorDetail } from "@vidstack/react";
import {
  DefaultVideoLayout,
  defaultLayoutIcons,
  DefaultAudioLayout,
} from "@vidstack/react/player/layouts/default";
import { motion, AnimatePresence } from "framer-motion";
import {
  WifiOff,
  History,
  FileWarning,
  Download,
  ExternalLink,
  PlayCircle,
  ShieldAlert,
  Copy,
} from "lucide-react";
import { formatDuration } from "@/lib/utils";
import { useAppStore } from "@/lib/store";

import "@vidstack/react/player/styles/default/theme.css";
import "@vidstack/react/player/styles/default/layouts/video.css";
import "@vidstack/react/player/styles/default/layouts/audio.css";

interface SubtitleTrack {
  kind: string;
  src: string;
  srcLang: string;
  label: string;
  default: boolean;
}

interface VideoAudioPreviewProps {
  src: string;
  title: string;
  type: "video" | "audio";
  poster?: string;
  mimeType: string;
  subtitleTracks?: SubtitleTrack[];
  onEnded?: () => void;
  webViewLink?: string;
}

export default function VideoPlayer({
  src,
  title,
  type,
  poster,
  mimeType,
  subtitleTracks,
  onEnded,
  webViewLink,
}: VideoAudioPreviewProps) {
  const { addToast } = useAppStore();
  const playerRef = useRef<MediaPlayerInstance>(null);
  const [networkError, setNetworkError] = useState(false);
  const [formatError, setFormatError] = useState(false);
  const [lastTime, setLastTime] = useState(0);
  const [currentSrc, setCurrentSrc] = useState(src);
  const [retryCount, setRetryCount] = useState(0);
  const [isDirectMode, setIsDirectMode] = useState(false);

  const handleCopyStreamInfo = () => {
    navigator.clipboard.writeText(currentSrc);
    addToast({
      message: "Link streaming disalin! Paste di VLC.",
      type: "success",
    });
  };

  const displayMimeType =
    mimeType.includes("matroska") || title.toLowerCase().endsWith(".mkv")
      ? "video/webm"
      : mimeType;

  useEffect(() => {
    setCurrentSrc(src);
    setNetworkError(false);
    setFormatError(false);
    setLastTime(0);
    setRetryCount(0);
  }, [src]);

  const handleRetry = () => {
    setNetworkError(false);
    setFormatError(false);
    const separator = src.includes("?") ? "&" : "?";
    const retrySrc = `${src}${separator}retry=${Date.now()}`;
    setCurrentSrc(retrySrc);
  };

  const handleError = (detail: MediaErrorDetail) => {
    if (playerRef.current && playerRef.current.currentTime > 0) {
      setLastTime(playerRef.current.currentTime);
    }

    if (detail.code === 4) {
      setFormatError(true);
    } else if (detail.code === 2 || detail.code === 3) {
      if (retryCount < 3) {
        setRetryCount((prev) => prev + 1);
        console.log(`Auto-retrying video... Attempt ${retryCount + 1}/3`);
        setTimeout(() => {
          handleRetry();
        }, 1000);
      } else {
        setNetworkError(true);
      }
    }
  };

  const handleCanPlay = () => {
    setNetworkError(false);
    setFormatError(false);
    setRetryCount(0);

    if (lastTime > 0 && playerRef.current) {
      const player = playerRef.current;
      if (Math.abs(player.currentTime - lastTime) > 1) {
        player.currentTime = lastTime;
      }
      player.play().catch((e) => console.log(e));
    }
  };

  const previewLink = webViewLink
    ? webViewLink.replace("/view", "/preview")
    : null;

  if (isDirectMode && previewLink && type === "video") {
    return (
      <div className="relative w-full h-full bg-black flex flex-col items-center justify-center rounded-xl overflow-hidden shadow-2xl">
        <iframe
          src={previewLink}
          className="w-full h-full flex-1"
          allow="autoplay"
          allowFullScreen
        />
        <div className="absolute top-2 right-2 flex gap-2 z-10">
          <button
            onClick={() => setIsDirectMode(false)}
            className="px-3 py-1 bg-black/50 hover:bg-black/70 text-white rounded-lg text-xs font-medium backdrop-blur-md border border-white/10 transition-colors flex items-center gap-2"
          >
            <ShieldAlert size={14} /> Mode Proxy (Lambat)
          </button>

          <a
            href={webViewLink}
            target="_blank"
            rel="noreferrer"
            className="px-3 py-1 bg-black/50 hover:bg-black/70 text-white rounded-lg text-xs font-medium backdrop-blur-md border border-white/10 transition-colors flex items-center gap-2"
          >
            <ExternalLink size={14} /> Buka Drive
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-black flex items-center justify-center rounded-xl overflow-hidden shadow-2xl">
      <MediaPlayer
        ref={playerRef}
        title={title}
        src={{ src: currentSrc, type: displayMimeType as any }}
        poster={poster?.replace("=s220", "=s1280")}
        aspectRatio={type === "video" ? "16/9" : undefined}
        onEnded={() => {
          if (playerRef.current) {
            const { currentTime, duration } = playerRef.current;
            if (duration > 0 && Math.abs(duration - currentTime) > 1) {
              return;
            }
          }
          onEnded?.();
        }}
        onError={handleError}
        onCanPlay={handleCanPlay}
        className="w-full h-full ring-media-focus"
        crossOrigin
        autoplay={true}
        playsInline
      >
        <MediaProvider>
          {type === "video" && poster && (
            <div className="vds-poster w-full h-full absolute inset-0 object-cover" />
          )}
          {type === "video" &&
            subtitleTracks?.map((track, i) => (
              <Track
                key={String(i)}
                src={track.src}
                kind={track.kind as any}
                label={track.label}
                lang={track.srcLang}
                default={track.default}
              />
            ))}
        </MediaProvider>

        {type === "video" ? (
          <DefaultVideoLayout
            thumbnails={poster?.replace("=s220", "=s1280")}
            icons={defaultLayoutIcons}
          />
        ) : (
          <DefaultAudioLayout icons={defaultLayoutIcons} />
        )}
        {type === "video" && (
          <div className="absolute top-2 right-2 flex gap-2 z-20 opacity-0 hover:opacity-100 transition-opacity duration-300">
            {webViewLink && (
              <>
                <button
                  onClick={() => setIsDirectMode(true)}
                  className="px-3 py-1 bg-black/50 hover:bg-primary/80 text-white rounded-lg text-xs font-medium backdrop-blur-md border border-white/10 transition-colors flex items-center gap-2"
                  title="Gunakan player Google Drive langsung (Lebih Cepat)"
                >
                  <PlayCircle size={14} /> Mode Direct (Cepat)
                </button>
                <a
                  href={webViewLink}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1 bg-black/50 hover:bg-black/70 text-white rounded-lg text-xs font-medium backdrop-blur-md border border-white/10 transition-colors flex items-center gap-2"
                >
                  <ExternalLink size={14} /> Buka Drive
                </a>
              </>
            )}
          </div>
        )}
      </MediaPlayer>

      <AnimatePresence>
        {networkError && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 text-white backdrop-blur-sm p-4 text-center"
          >
            <WifiOff size={48} className="mb-4 text-red-500" />
            <h3 className="text-xl font-bold mb-2">Koneksi Terputus</h3>
            <p className="text-sm text-gray-300 mb-6 max-w-xs">
              Posisi terakhir: {formatDuration(lastTime)}
            </p>
            <button
              onClick={handleRetry}
              className="px-6 py-2 bg-primary hover:bg-primary/90 rounded-full font-semibold transition-colors flex items-center gap-2"
            >
              <History size={18} /> Sambung Ulang
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {formatError && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-zinc-900/95 text-white p-4 text-center"
          >
            <FileWarning size={48} className="mb-4 text-amber-500" />
            <h3 className="text-xl font-bold mb-2">Format Tidak Didukung</h3>
            <p className="text-sm text-gray-300 mb-4 max-w-sm">
              Codec video ini (kemungkinan HEVC/x265) tidak didukung browser.
              <br />
              <span className="text-white font-medium mt-1 block">
                Solusi: Gunakan VLC Media Player.
              </span>
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <button
                onClick={handleCopyStreamInfo}
                className="px-4 py-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-lg text-sm font-medium flex items-center gap-2"
              >
                <Copy size={16} /> Salin Link Streaming
              </button>
              <a
                href={currentSrc}
                download
                className="px-4 py-2 bg-primary hover:bg-primary/90 rounded-lg text-sm font-medium flex items-center gap-2"
              >
                <Download size={16} /> Unduh File
              </a>
            </div>
            <button
              onClick={handleRetry}
              className="mt-4 text-xs text-white/50 hover:text-white underline"
            >
              Coba Paksa Putar (Mungkin Gagal)
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

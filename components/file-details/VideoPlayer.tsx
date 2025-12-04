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
import { WifiOff, History, FileWarning, Download } from "lucide-react";
import { formatDuration } from "@/lib/utils";

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
}

export default function VideoPlayer({
  src,
  title,
  type,
  poster,
  mimeType,
  subtitleTracks,
  onEnded,
}: VideoAudioPreviewProps) {
  const playerRef = useRef<MediaPlayerInstance>(null);
  const [networkError, setNetworkError] = useState(false);
  const [formatError, setFormatError] = useState(false);
  const [lastTime, setLastTime] = useState(0);
  const [currentSrc, setCurrentSrc] = useState(src);

  const displayMimeType =
    mimeType.includes("matroska") || title.toLowerCase().endsWith(".mkv")
      ? "video/webm"
      : mimeType;

  useEffect(() => {
    setCurrentSrc(src);
    setNetworkError(false);
    setFormatError(false);
    setLastTime(0);
  }, [src]);

  const handleError = (detail: MediaErrorDetail) => {
    if (playerRef.current && playerRef.current.currentTime > 0) {
      setLastTime(playerRef.current.currentTime);
    }

    if (detail.code === 4) {
      setFormatError(true);
    } else if (detail.code === 2 || detail.code === 3) {
      setNetworkError(true);
    }
  };

  const handleRetry = () => {
    setNetworkError(false);
    setFormatError(false);
    const separator = src.includes("?") ? "&" : "?";
    const retrySrc = `${src}${separator}retry=${Date.now()}`;
    setCurrentSrc(retrySrc);
  };

  const handleCanPlay = () => {
    setNetworkError(false);
    setFormatError(false);
    if (lastTime > 0 && playerRef.current) {
      const player = playerRef.current;
      if (Math.abs(player.currentTime - lastTime) > 1) {
        player.currentTime = lastTime;
      }
      player.play().catch((e) => console.log(e));
    }
  };

  return (
    <div className="relative w-full h-full bg-black flex items-center justify-center rounded-xl overflow-hidden shadow-2xl">
      <MediaPlayer
        ref={playerRef}
        title={title}
        src={{ src: currentSrc, type: displayMimeType as any }}
        poster={poster?.replace("=s220", "=s1280")}
        aspectRatio={type === "video" ? "16/9" : undefined}
        onEnded={onEnded}
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
            <p className="text-sm text-gray-300 mb-4 max-w-xs">
              Codec video ini kemungkinan HEVC tidak didukung browser.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleRetry}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/10 rounded-lg text-sm font-medium"
              >
                Coba Paksa
              </button>
              <a
                href={currentSrc}
                download
                className="px-4 py-2 bg-primary hover:bg-primary/90 rounded-lg text-sm font-medium flex items-center gap-2"
              >
                <Download size={16} /> Unduh File
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

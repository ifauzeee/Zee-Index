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
} from "lucide-react";
import { formatDuration, cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import { srtToVtt } from "@/lib/subtitleUtils";

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
  const { videoProgress, setVideoProgress, addToast } = useAppStore();
  const playerRef = useRef<MediaPlayerInstance>(null);
  const [networkError, setNetworkError] = useState(false);
  const [formatError, setFormatError] = useState(false);
  const [lastTime, setLastTime] = useState(0);
  const [currentSrc, setCurrentSrc] = useState(src);
  const [retryCount, setRetryCount] = useState(0);
  const [hasResumed, setHasResumed] = useState(false);
  const [processedTracks, setProcessedTracks] = useState<SubtitleTrack[]>([]);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
  }, []);

  useEffect(() => {
    let active = true;
    const createdUrls: string[] = [];

    const processTracks = async () => {
      if (!subtitleTracks) {
        if (active) setProcessedTracks([]);
        return;
      }

      const tracks = await Promise.all(
        subtitleTracks.map(async (track) => {
          if (track.src.startsWith("blob:") || track.src.endsWith(".vtt")) {
            return track;
          }

          try {
            const response = await fetch(track.src);
            const text = await response.text();

            if (text.trim().startsWith("WEBVTT")) {
              return track;
            }

            const vtt = srtToVtt(text);
            const blob = new Blob([vtt], { type: "text/vtt" });
            const url = URL.createObjectURL(blob);
            createdUrls.push(url);
            return {
              ...track,
              src: url,
            };
          } catch (e) {
            console.error("Failed to convert subtitle:", e);
            return track;
          }
        }),
      );

      if (active) setProcessedTracks(tracks);
    };

    processTracks();

    return () => {
      active = false;
      createdUrls.forEach((url) => {
        URL.revokeObjectURL(url);
      });
    };
  }, [subtitleTracks]);

  const fileIdMatch = src.match(/fileId=([^&]+)/);
  const fileId = fileIdMatch ? fileIdMatch[1] : null;

  const isMkv =
    mimeType.includes("matroska") || title.toLowerCase().endsWith(".mkv");

  const displayMimeType = isMkv ? "video/webm" : mimeType;

  useEffect(() => {
    setCurrentSrc(src);
    setNetworkError(false);
    setFormatError(false);
    setLastTime(0);
    setRetryCount(0);
    setHasResumed(false);
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

    if (hasResumed) return;

    if (lastTime > 0 && playerRef.current) {
      const player = playerRef.current;
      if (Math.abs(player.currentTime - lastTime) > 1) {
        player.currentTime = lastTime;
      }
      player.play().catch(() => {});
    } else if (
      fileId &&
      videoProgress[fileId] &&
      videoProgress[fileId] > 5 &&
      playerRef.current
    ) {
      const savedTime = videoProgress[fileId];
      const duration = playerRef.current.duration;

      if (duration > 0 && savedTime < duration * 0.95) {
        playerRef.current.currentTime = savedTime;
        setHasResumed(true);
        addToast({
          message: `Resuming playback from ${formatDuration(savedTime)}`,
          type: "info",
        });
      }
    }
  };

  const handleTimeUpdate = (detail: any) => {
    if (fileId && detail.currentTime > 5) {
      if (Math.floor(detail.currentTime) % 10 === 0) {
        setVideoProgress(fileId, detail.currentTime);
      }
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
        onEnded={() => {
          if (fileId) {
            setVideoProgress(fileId, 0);
          }

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
        onTimeUpdate={handleTimeUpdate}
        logLevel="silent"
        className="w-full h-full ring-media-focus"
        crossOrigin="use-credentials"
        autoplay={true}
        playsInline
        load="eager"
        posterLoad="eager"
        preload="auto"
        streamType="on-demand"
      >
        <MediaProvider>
          {type === "video" && poster && (
            <div className="vds-poster w-full h-full absolute inset-0 object-cover" />
          )}
          {type === "video" &&
            processedTracks.map((track, i) => (
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
          <div
            className={cn(
              "absolute top-4 right-4 flex flex-col items-end gap-3 z-20 transition-all duration-500",
              isMobile ? "opacity-100" : "opacity-0 group-hover:opacity-100",
            )}
          >
            {webViewLink && !isMobile && (
              <a
                href={webViewLink}
                target="_blank"
                rel="noreferrer"
                className="p-2 bg-black/40 hover:bg-black/80 text-white rounded-xl backdrop-blur-md border border-white/10 transition-all shadow-lg"
                title="Buka original di Google Drive"
              >
                <ExternalLink size={16} />
              </a>
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
              Codec video ini tidak didukung browser.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
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

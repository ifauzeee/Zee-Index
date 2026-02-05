"use client";

import React, { useRef, useState, useEffect, useMemo } from "react";
import {
  MediaPlayer,
  MediaProvider,
  Track,
  useMediaState,
} from "@vidstack/react";
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
import { useTranslations } from "next-intl";

import "@vidstack/react/player/styles/default/theme.css";
import "@vidstack/react/player/styles/default/layouts/video.css";
import "@vidstack/react/player/styles/default/layouts/audio.css";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MonitorPlay, Copy, Play } from "lucide-react";

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
  const [showResumePrompt, setShowResumePrompt] = useState(false);
  const [resumeTime, setResumeTime] = useState(0);
  const controlsVisible = useMediaState("controlsVisible", playerRef);

  const tPlayer = useTranslations("VideoPlayer");

  useEffect(() => {
    setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));

    const { isAudioPlaying, toggleAudioPlay } = useAppStore.getState();
    if (isAudioPlaying) {
      toggleAudioPlay();
    }

    return () => {
      if (playerRef.current) {
        playerRef.current.pause();
      }
    };
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
    setShowResumePrompt(false);
    setProcessedTracks([]);
  }, [src]);

  const handleRetry = () => {
    if (playerRef.current && playerRef.current.currentTime > 0) {
      setLastTime(playerRef.current.currentTime);
    }
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
      videoProgress[fileId] > 10 &&
      playerRef.current &&
      !hasResumed
    ) {
      const savedTime = videoProgress[fileId];
      const duration = playerRef.current.duration;

      if (duration > 0 && savedTime < duration * 0.95) {
        setResumeTime(savedTime);
        setShowResumePrompt(true);
      }
    }
  };

  const performResume = () => {
    if (playerRef.current && resumeTime > 0) {
      playerRef.current.currentTime = resumeTime;
      setHasResumed(true);
      setShowResumePrompt(false);
      playerRef.current.play().catch(() => {});
    }
  };

  const skipResume = () => {
    setShowResumePrompt(false);
    setHasResumed(true);
    if (playerRef.current) {
      playerRef.current.play().catch(() => {});
    }
  };

  const handleTimeUpdate = (detail: any) => {
    if (fileId && detail.currentTime > 5 && !showResumePrompt) {
      if (Math.floor(detail.currentTime) % 10 === 0) {
        setVideoProgress(fileId, detail.currentTime);
      }
    }
  };

  const getHasAbsoluteUrl = (url: string) => {
    if (typeof window === "undefined") return url;
    if (url.startsWith("http")) return url;
    return `${window.location.origin}${url}`;
  };

  const getAbsoluteSrc = () => getHasAbsoluteUrl(currentSrc);

  const uniqueTracks = useMemo(() => {
    const seenLabels = new Set<string>();

    return processedTracks.filter((track: SubtitleTrack) => {
      const labelKey = (track.label || "Subtitle").trim().toLowerCase();
      if (seenLabels.has(labelKey)) return false;
      seenLabels.add(labelKey);
      return true;
    });
  }, [processedTracks]);

  return (
    <div className="relative w-full h-full bg-black flex items-center justify-center rounded-xl overflow-hidden shadow-2xl min-h-[220px] md:min-h-[400px]">
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
        crossOrigin="anonymous"
        autoplay={false}
        playsInline
        load={isMobile ? "play" : "eager"}
        posterLoad="visible"
        preload={isMobile ? "metadata" : "auto"}
        streamType="on-demand"
      >
        <MediaProvider>
          {type === "video" && poster && (
            <div className="vds-poster w-full h-full absolute inset-0 object-cover" />
          )}
          {type === "video" &&
            uniqueTracks.map((track: SubtitleTrack) => (
              <Track
                key={track.src}
                id={track.src}
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
            noModal={isMobile}
            className="vds-video-layout"
          />
        ) : (
          <DefaultAudioLayout icons={defaultLayoutIcons} />
        )}

        {type === "video" && (
          <div
            className={cn(
              "absolute top-4 right-4 flex flex-col items-end gap-3 z-20 transition-all duration-500",
              controlsVisible ? "opacity-100" : "opacity-0 pointer-events-none",
            )}
          >
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
                  onClick={() => {
                    navigator.clipboard.writeText(getAbsoluteSrc());
                    addToast({
                      message: "URL Stream disalin!",
                      type: "success",
                    });
                  }}
                >
                  <Copy className="mr-2 h-4 w-4" /> Copy URL
                </DropdownMenuItem>

                <DropdownMenuItem
                  className="cursor-pointer hover:bg-white/10 focus:bg-white/10 focus:text-white"
                  onClick={() =>
                    (window.location.href = `vlc://${getAbsoluteSrc()}`)
                  }
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

      <AnimatePresence>
        {showResumePrompt && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-[2px]"
          >
            <div className="bg-background border p-6 rounded-2xl shadow-2xl max-w-sm w-full text-center">
              <div className="mx-auto w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mb-4 text-primary">
                <History size={24} />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-1">
                {tPlayer("resumeTitle")}
              </h3>
              <p className="text-sm text-muted-foreground mb-6">
                {tPlayer("resumeMessage", {
                  time: formatDuration(resumeTime),
                })}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={skipResume}
                  className="px-4 py-2.5 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-xl text-sm font-medium transition-colors"
                >
                  {tPlayer("startOver")}
                </button>
                <button
                  onClick={performResume}
                  className="px-4 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-sm font-medium transition-colors"
                >
                  {tPlayer("resumeButton")}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

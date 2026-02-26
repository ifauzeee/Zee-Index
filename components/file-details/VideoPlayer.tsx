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
  Loader2,
  Tv,
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
import { Button } from "@/components/ui/button";

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
  const {
    videoProgress,
    setVideoProgress,
    addToast,
    isTheaterMode,
    toggleTheaterMode,
    sharePolicy,
    user,
  } = useAppStore();
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
  const [upNextCountdown, setUpNextCountdown] = useState<number | null>(null);
  const controlsVisible = useMediaState("controlsVisible", playerRef);
  const buffering = useMediaState("waiting", playerRef);

  const tPlayer = useTranslations("VideoPlayer");

  useEffect(() => {
    setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));

    const { isAudioPlaying, toggleAudioPlay } = useAppStore.getState();
    if (isAudioPlaying) {
      toggleAudioPlay();
    }

    const currentPlayer = playerRef.current;
    return () => {
      if (currentPlayer) {
        currentPlayer.pause();
      }
    };
  }, []);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (upNextCountdown !== null && upNextCountdown > 0) {
      timer = setTimeout(() => setUpNextCountdown(upNextCountdown - 1), 1000);
    } else if (upNextCountdown === 0) {
      setUpNextCountdown(null);
      onEnded?.();
    }
    return () => clearTimeout(timer);
  }, [upNextCountdown, onEnded]);

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
    setUpNextCountdown(null);
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
    console.warn("[VideoPlayer] Event Error:", detail);

    if (playerRef.current && playerRef.current.currentTime > 0) {
      setLastTime(playerRef.current.currentTime);
    }

    if (detail.code === 4) {
      setFormatError(true);
    } else if (detail.code === 2 || detail.code === 3) {
      if (detail.code === 3 && navigator.userAgent.includes("Firefox")) {
        setFormatError(true);
        return;
      }

      if (retryCount < 3) {
        setRetryCount((prev) => prev + 1);
        setTimeout(() => {
          handleRetry();
        }, 1000);
      } else {
        setNetworkError(true);
      }
    } else {
      setFormatError(true);
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
      setHasResumed(true);
    } else if (
      fileId &&
      videoProgress[fileId] &&
      playerRef.current &&
      !hasResumed
    ) {
      const savedTime = videoProgress[fileId];
      if (savedTime > 10) {
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
      setTimeout(() => {
        playerRef.current
          ?.play()
          .catch((e) => console.debug("Resume play failed:", e));
      }, 100);
    }
  };

  const skipResume = () => {
    if (fileId) {
      setVideoProgress(fileId, 0);
    }
    setResumeTime(0);
    setShowResumePrompt(false);
    setHasResumed(true);
    if (playerRef.current) {
      playerRef.current.currentTime = 0;
      setTimeout(() => {
        playerRef.current
          ?.play()
          .catch((e) => console.debug("Start over play failed:", e));
      }, 100);
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
        key={currentSrc}
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

          if (onEnded && !isMobile) {
            setUpNextCountdown(10);
          } else {
            onEnded?.();
          }
        }}
        onError={handleError}
        onCanPlay={handleCanPlay}
        onTimeUpdate={handleTimeUpdate}
        onWaiting={() => {
          console.debug("[VideoPlayer] Buffering...");
        }}
        onPlaying={() => {
          console.debug("[VideoPlayer] Playing");
        }}
        logLevel="silent"
        className="w-full h-full ring-media-focus"
        crossOrigin="anonymous"
        autoplay={false}
        playsInline
        load={isMobile ? "idle" : "eager"}
        posterLoad="visible"
        preload="auto"
        streamType="on-demand"
        storage="local-storage"
        keyDisabled={false}
        fullscreenOrientation="landscape"
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
            {!sharePolicy?.preventDownload && (
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

            {!isMobile && !sharePolicy?.preventDownload && (
              <button
                onClick={toggleTheaterMode}
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
        )}

        {sharePolicy?.hasWatermark && (
          <div className="absolute inset-0 pointer-events-none z-[90] overflow-hidden flex flex-wrap justify-around items-center opacity-[0.25] mix-blend-overlay w-full h-full select-none">
            {Array.from({ length: 15 }).map((_, i) => (
              <div
                key={i}
                className="text-white text-xl sm:text-2xl md:text-3xl font-black -rotate-[30deg] p-6 sm:p-10 whitespace-nowrap shadow-black drop-shadow-md"
              >
                {sharePolicy?.watermarkText ||
                  user?.email ||
                  user?.name ||
                  "Confidential View"}
                <br />
                <span className="text-sm sm:text-lg opacity-80">
                  {new Date().toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </MediaPlayer>

      <AnimatePresence>
        {upNextCountdown !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[70] flex items-center justify-center bg-black/90 backdrop-blur-md"
          >
            <div className="text-center p-8 max-w-sm w-full">
              <div className="relative w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90 absolute">
                  <circle
                    cx="48"
                    cy="48"
                    r="45"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="transparent"
                    className="text-white/10"
                  />
                  <motion.circle
                    cx="48"
                    cy="48"
                    r="45"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="transparent"
                    strokeDasharray="283"
                    initial={{ strokeDashoffset: 283 }}
                    animate={{
                      strokeDashoffset:
                        283 - (283 * (10 - upNextCountdown)) / 10,
                    }}
                    className="text-primary"
                  />
                </svg>
                <div className="text-3xl font-bold z-10">{upNextCountdown}</div>
              </div>
              <h3 className="text-2xl font-bold mb-2">{tPlayer("upNext")}</h3>
              <p className="text-gray-400 mb-8">{tPlayer("autoPlayNext")}</p>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => setUpNextCountdown(null)}
                  className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-full font-medium transition-colors"
                >
                  {tPlayer("cancel")}
                </button>
                <button
                  onClick={() => {
                    setUpNextCountdown(null);
                    onEnded?.();
                  }}
                  className="px-6 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full font-bold transition-colors"
                >
                  {tPlayer("playNow")}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
            <Button
              onClick={handleRetry}
              className="px-6 rounded-full font-semibold flex items-center gap-2"
            >
              <History size={18} /> Sambung Ulang
            </Button>
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
            <h3 className="text-xl font-bold mb-2">
              {tPlayer("unsupportedFormat")}
            </h3>
            <p className="text-sm text-gray-300 mb-4 max-w-sm">
              {tPlayer("codecNotSupported")}
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button
                onClick={() => {
                  const iframe = document.createElement("iframe");
                  iframe.style.display = "none";
                  iframe.src = currentSrc;
                  document.body.appendChild(iframe);
                  setTimeout(() => {
                    document.body.removeChild(iframe);
                  }, 5000);
                }}
                className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
              >
                <Download size={16} /> {tPlayer("downloadFile")}
              </Button>
              <Button
                variant="secondary"
                onClick={() =>
                  (window.location.href = `vlc://${getAbsoluteSrc()}`)
                }
                className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
              >
                <Play size={16} /> VLC (PC)
              </Button>
              <Button
                variant="secondary"
                onClick={() =>
                  (window.location.href = `intent:${getAbsoluteSrc()}#Intent;package=org.videolan.vlc;type=video/*;scheme=https;end`)
                }
                className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
              >
                <Play size={16} /> VLC (Mobile)
              </Button>
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

      <AnimatePresence>
        {buffering && !networkError && !formatError && !showResumePrompt && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none"
          >
            <div className="relative">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-20 h-20 border-4 border-primary/30 border-t-primary rounded-full shadow-[0_0_20px_rgba(var(--primary),0.3)]"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-12 h-12 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center">
                  <Loader2 size={24} className="text-primary animate-spin" />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

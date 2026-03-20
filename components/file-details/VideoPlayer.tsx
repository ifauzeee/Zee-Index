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
import { AnimatePresence } from "framer-motion";
import { useAppStore } from "@/lib/store";
import { srtToVtt } from "@/lib/subtitleUtils";
import { useTranslations } from "next-intl";

import "@vidstack/react/player/styles/default/theme.css";
import "@vidstack/react/player/styles/default/layouts/video.css";
import "@vidstack/react/player/styles/default/layouts/audio.css";

import { VideoControlsOverlay } from "./video-player/Controls";
import {
  UpNextOverlay,
  NetworkErrorOverlay,
  FormatErrorOverlay,
  ResumePromptOverlay,
  BufferingOverlay,
  WatermarkOverlay,
} from "./video-player/Overlays";

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
            return { ...track, src: url };
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
      createdUrls.forEach((url) => URL.revokeObjectURL(url));
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
        setTimeout(() => handleRetry(), 1000);
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
      player.play().catch(() => { });
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
    if (fileId) setVideoProgress(fileId, 0);
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

  const getAbsoluteSrc = () => {
    if (typeof window === "undefined") return currentSrc;
    if (currentSrc.startsWith("http")) return currentSrc;
    return `${window.location.origin}${currentSrc}`;
  };

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
          if (fileId) setVideoProgress(fileId, 0);

          if (playerRef.current) {
            const { currentTime, duration } = playerRef.current;
            if (duration > 0 && Math.abs(duration - currentTime) > 1) return;
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
        onWaiting={() => console.debug("[VideoPlayer] Buffering...")}
        onPlaying={() => console.debug("[VideoPlayer] Playing")}
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
          <VideoControlsOverlay
            controlsVisible={controlsVisible}
            isMobile={isMobile}
            isTheaterMode={isTheaterMode}
            webViewLink={webViewLink}
            preventDownload={sharePolicy?.preventDownload}
            getAbsoluteSrc={getAbsoluteSrc}
            onCopyUrl={() => {
              navigator.clipboard.writeText(getAbsoluteSrc());
              addToast({ message: "URL Stream disalin!", type: "success" });
            }}
            onToggleTheater={toggleTheaterMode}
          />
        )}

        {sharePolicy?.hasWatermark && (
          <WatermarkOverlay
            watermarkText={sharePolicy.watermarkText}
            userEmail={user?.email}
            userName={user?.name}
          />
        )}
      </MediaPlayer>

      <AnimatePresence>
        {upNextCountdown !== null && (
          <UpNextOverlay
            countdown={upNextCountdown}
            onCancel={() => setUpNextCountdown(null)}
            onPlayNow={() => {
              setUpNextCountdown(null);
              onEnded?.();
            }}
            tPlayer={tPlayer}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {networkError && (
          <NetworkErrorOverlay lastTime={lastTime} onRetry={handleRetry} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {formatError && (
          <FormatErrorOverlay
            currentSrc={currentSrc}
            getAbsoluteSrc={getAbsoluteSrc}
            tPlayer={tPlayer}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showResumePrompt && (
          <ResumePromptOverlay
            resumeTime={resumeTime}
            onResume={performResume}
            onSkip={skipResume}
            tPlayer={tPlayer}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        <BufferingOverlay
          show={
            buffering && !networkError && !formatError && !showResumePrompt
          }
        />
      </AnimatePresence>
    </div>
  );
}

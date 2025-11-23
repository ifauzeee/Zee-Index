"use client";

import React, { useRef, useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";
import { Play, Pause, X, Volume2, VolumeX, Music } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDuration } from "@/lib/utils";

export default function GlobalAudioPlayer() {
  const {
    activeAudioFile,
    isAudioPlaying,
    toggleAudioPlay,
    closeAudio,
    shareToken,
  } = useAppStore();

  const audioRef = useRef<HTMLAudioElement>(null);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    if (!audioRef.current) return;

    if (isAudioPlaying) {
      audioRef.current.play().catch(() => {});
    } else {
      audioRef.current.pause();
    }
  }, [isAudioPlaying, activeAudioFile]);

  useEffect(() => {
    if (activeAudioFile && audioRef.current) {
      audioRef.current.load();
      if (isAudioPlaying) audioRef.current.play().catch(console.error);
    }
  }, [activeAudioFile, isAudioPlaying]);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setProgress(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setProgress(time);
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const getAudioSrc = () => {
    if (!activeAudioFile) return "";
    let url = `/api/download?fileId=${activeAudioFile.id}`;
    if (shareToken) url += `&share_token=${shareToken}`;
    return url;
  };

  if (!activeAudioFile) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:w-96 z-[10000] bg-card/95 backdrop-blur-md border border-border shadow-2xl rounded-xl overflow-hidden"
      >
        <audio
          ref={audioRef}
          src={getAudioSrc()}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={() => useAppStore.setState({ isAudioPlaying: false })}
          onError={() => {
            useAppStore
              .getState()
              .addToast({ message: "Gagal memuat audio", type: "error" });
            closeAudio();
          }}
        />

        <div className="relative h-1 w-full bg-muted cursor-pointer group">
          <div
            className="absolute top-0 left-0 h-full bg-primary transition-all duration-100"
            style={{ width: `${(progress / (duration || 1)) * 100}%` }}
          />
          <input
            type="range"
            min="0"
            max={duration || 0}
            value={progress}
            onChange={handleSeek}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          />
        </div>

        <div className="p-4 flex items-center gap-4">
          <div className="h-12 w-12 rounded-md bg-primary/10 flex items-center justify-center shrink-0 text-primary">
            <Music size={24} />
          </div>

          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm truncate">
              {activeAudioFile.name}
            </h4>
            <p className="text-xs text-muted-foreground font-mono">
              {formatDuration(progress)} / {formatDuration(duration)}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleAudioPlay}
              className="h-10 w-10 flex items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
            >
              {isAudioPlaying ? (
                <Pause size={18} fill="currentColor" />
              ) : (
                <Play size={18} fill="currentColor" className="ml-0.5" />
              )}
            </button>

            <button
              onClick={toggleMute}
              className="p-2 text-muted-foreground hover:text-foreground transition-colors hidden sm:block"
            >
              {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>

            <div className="w-px h-6 bg-border mx-1"></div>

            <button
              onClick={closeAudio}
              className="p-2 text-muted-foreground hover:text-destructive transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

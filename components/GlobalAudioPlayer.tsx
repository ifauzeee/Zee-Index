"use client";

import React, { useRef, useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";
import {
  Play,
  Pause,
  X,
  Volume2,
  VolumeX,
  Music,
  SkipBack,
  SkipForward,
  ListMusic,
  Trash2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDuration } from "@/lib/utils";

export default function GlobalAudioPlayer() {
  const {
    activeAudioFile,
    isAudioPlaying,
    toggleAudioPlay,
    closeAudio,
    shareToken,
    playNextTrack,
    playPrevTrack,
    audioQueue,
    removeFromQueue,
    playAudio,
  } = useAppStore();

  const audioRef = useRef<HTMLAudioElement>(null);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [showQueue, setShowQueue] = useState(false);

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

  const getAudioSrc = (fileId: string) => {
    let url = `/api/download?fileId=${fileId}`;
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
        transition={{ type: "tween", duration: 0.3, ease: "easeOut" }}
        className="fixed bottom-20 lg:bottom-4 left-4 right-4 md:left-auto md:right-6 md:w-96 z-[9990] flex flex-col gap-2"
      >
        {showQueue && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "tween", duration: 0.2 }}
            className="bg-card border border-border shadow-2xl rounded-xl overflow-hidden max-h-64 flex flex-col"
          >
            <div className="p-3 border-b font-semibold text-sm flex justify-between items-center bg-muted/10">
              <span>Antrean Putar ({audioQueue.length})</span>
              <button onClick={() => setShowQueue(false)}>
                <X size={16} />
              </button>
            </div>
            <div className="overflow-y-auto p-2 space-y-1">
              {audioQueue.map((file, idx) => (
                <div
                  key={`${file.id}-${idx}`}
                  className={`flex items-center justify-between p-2 rounded-md text-xs ${
                    file.id === activeAudioFile.id
                      ? "bg-primary/20 text-primary font-medium"
                      : "hover:bg-accent cursor-pointer"
                  }`}
                  onClick={() =>
                    file.id !== activeAudioFile.id &&
                    playAudio(file, audioQueue)
                  }
                >
                  <div className="truncate flex-1 mr-2">{file.name}</div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFromQueue(file.id);
                    }}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        <div className="bg-card border border-border shadow-2xl rounded-xl overflow-hidden">
          <audio
            ref={audioRef}
            src={getAudioSrc(activeAudioFile.id)}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={playNextTrack}
            onError={() => {
              useAppStore
                .getState()
                .addToast({ message: "Gagal memuat audio", type: "error" });
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

          <div className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center shrink-0 text-primary">
              <Music size={20} />
            </div>

            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-sm truncate">
                {activeAudioFile.name}
              </h4>
              <p className="text-[10px] text-muted-foreground font-mono">
                {formatDuration(progress)} / {formatDuration(duration)}
              </p>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={playPrevTrack}
                className="p-2 text-foreground hover:text-primary transition-colors"
                disabled={audioQueue.length <= 1}
              >
                <SkipBack size={18} />
              </button>

              <button
                onClick={toggleAudioPlay}
                className="h-8 w-8 flex items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
              >
                {isAudioPlaying ? (
                  <Pause size={14} fill="currentColor" />
                ) : (
                  <Play size={14} fill="currentColor" className="ml-0.5" />
                )}
              </button>

              <button
                onClick={playNextTrack}
                className="p-2 text-foreground hover:text-primary transition-colors"
                disabled={audioQueue.length <= 1}
              >
                <SkipForward size={18} />
              </button>
            </div>
          </div>

          <div className="px-4 pb-3 flex justify-between items-center border-t border-border/50 pt-2">
            <div className="flex items-center gap-2">
              <button
                onClick={toggleMute}
                className="text-muted-foreground hover:text-foreground"
              >
                {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>
              <button
                onClick={() => setShowQueue(!showQueue)}
                className={`text-muted-foreground hover:text-foreground ${
                  showQueue ? "text-primary" : ""
                }`}
              >
                <ListMusic size={16} />
              </button>
            </div>
            <button
              onClick={closeAudio}
              className="text-muted-foreground hover:text-destructive"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
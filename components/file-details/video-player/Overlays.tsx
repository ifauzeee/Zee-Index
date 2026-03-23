"use client";

import React from "react";
import { motion } from "framer-motion";
import { WifiOff, History, FileWarning, Download, Loader2 } from "lucide-react";
import { formatDuration } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";

interface UpNextOverlayProps {
  countdown: number;
  onCancel: () => void;
  onPlayNow: () => void;
  tPlayer: (key: string) => string;
}

export function UpNextOverlay({
  countdown,
  onCancel,
  onPlayNow,
  tPlayer,
}: UpNextOverlayProps) {
  return (
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
                strokeDashoffset: 283 - (283 * (10 - countdown)) / 10,
              }}
              className="text-primary"
            />
          </svg>
          <div className="text-3xl font-bold z-10">{countdown}</div>
        </div>
        <h3 className="text-2xl font-bold mb-2">{tPlayer("upNext")}</h3>
        <p className="text-gray-400 mb-8">{tPlayer("autoPlayNext")}</p>
        <div className="flex gap-4 justify-center">
          <button
            onClick={onCancel}
            className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-full font-medium transition-colors"
          >
            {tPlayer("cancel")}
          </button>
          <button
            onClick={onPlayNow}
            className="px-6 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full font-bold transition-colors"
          >
            {tPlayer("playNow")}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

interface NetworkErrorOverlayProps {
  lastTime: number;
  onRetry: () => void;
}

export function NetworkErrorOverlay({
  lastTime,
  onRetry,
}: NetworkErrorOverlayProps) {
  return (
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
        onClick={onRetry}
        className="px-6 rounded-full font-semibold flex items-center gap-2"
      >
        <History size={18} /> Sambung Ulang
      </Button>
    </motion.div>
  );
}

interface FormatErrorOverlayProps {
  currentSrc: string;
  getAbsoluteSrc: () => string;
  tPlayer: (key: string) => string;
}

export function FormatErrorOverlay({
  currentSrc,
  getAbsoluteSrc,
  tPlayer,
}: FormatErrorOverlayProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-zinc-900/95 text-white p-4 text-center"
    >
      <FileWarning size={48} className="mb-4 text-amber-500" />
      <h3 className="text-xl font-bold mb-2">{tPlayer("unsupportedFormat")}</h3>
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
          onClick={() => (window.location.href = `vlc://${getAbsoluteSrc()}`)}
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
  );
}

interface ResumePromptOverlayProps {
  resumeTime: number;
  onResume: () => void;
  onSkip: () => void;
  tPlayer: (key: string, params?: Record<string, string>) => string;
}

export function ResumePromptOverlay({
  resumeTime,
  onResume,
  onSkip,
  tPlayer,
}: ResumePromptOverlayProps) {
  return (
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
            onClick={onSkip}
            className="px-4 py-2.5 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-xl text-sm font-medium transition-colors"
          >
            {tPlayer("startOver")}
          </button>
          <button
            onClick={onResume}
            className="px-4 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-sm font-medium transition-colors"
          >
            {tPlayer("resumeButton")}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

interface BufferingOverlayProps {
  show: boolean;
}

export function BufferingOverlay({ show }: BufferingOverlayProps) {
  if (!show) return null;

  return (
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
  );
}

interface WatermarkOverlayProps {
  watermarkText?: string | null;
  userEmail?: string | null;
  userName?: string | null;
}

export function WatermarkOverlay({
  watermarkText,
  userEmail,
  userName,
}: WatermarkOverlayProps) {
  return (
    <div className="absolute inset-0 pointer-events-none z-[90] overflow-hidden flex flex-wrap justify-around items-center opacity-[0.25] mix-blend-overlay w-full h-full select-none">
      {Array.from({ length: 15 }).map((_, i) => (
        <div
          key={i}
          className="text-white text-xl sm:text-2xl md:text-3xl font-black -rotate-[30deg] p-6 sm:p-10 whitespace-nowrap shadow-black drop-shadow-md"
        >
          {watermarkText || userEmail || userName || "Confidential View"}
          <br />
          <span className="text-sm sm:text-lg opacity-80">
            {new Date().toLocaleDateString()}
          </span>
        </div>
      ))}
    </div>
  );
}

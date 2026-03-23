"use client";

import React, { useRef, useState, useEffect } from "react";
import { MediaPlayer, MediaProvider } from "@vidstack/react";
import type { MediaPlayerInstance } from "@vidstack/react";
import {
  DefaultAudioLayout,
  defaultLayoutIcons,
} from "@vidstack/react/player/layouts/default";
import { Music, Loader2 } from "lucide-react";
import Image from "next/image";

import "@vidstack/react/player/styles/default/theme.css";
import "@vidstack/react/player/styles/default/layouts/audio.css";

interface AudioPlayerProps {
  src: string;
  title: string;
  mimeType: string;
  poster?: string;
}

interface WindowWithWebkitAudioContext extends Window {
  webkitAudioContext?: typeof AudioContext;
}

export default function AudioPlayer({
  src,
  title,
  mimeType,
  poster,
}: AudioPlayerProps) {
  const playerRef = useRef<MediaPlayerInstance>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let audioCtx: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let animationId: number;

    const setupVisualizer = () => {
      const mediaElement = playerRef.current?.el?.querySelector("audio");
      if (!mediaElement || audioCtx) return;

      const audioWindow = window as WindowWithWebkitAudioContext;
      const AudioContextConstructor =
        globalThis.AudioContext || audioWindow.webkitAudioContext;
      if (!AudioContextConstructor) return;

      const nextAudioContext = new AudioContextConstructor();
      const nextAnalyser = nextAudioContext.createAnalyser();
      const nextSource =
        nextAudioContext.createMediaElementSource(mediaElement);

      nextSource.connect(nextAnalyser);
      nextAnalyser.connect(nextAudioContext.destination);

      audioCtx = nextAudioContext;
      analyser = nextAnalyser;
      analyser.fftSize = 256;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const draw = () => {
        animationId = requestAnimationFrame(draw);
        analyser!.getByteFrequencyData(dataArray);

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const barWidth = (canvas.width / bufferLength) * 2.5;
        let barHeight;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          barHeight = (dataArray[i] / 255) * canvas.height;

          const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
          gradient.addColorStop(0, "rgba(var(--primary-rgb), 0.2)");
          gradient.addColorStop(0.5, "rgba(var(--primary-rgb), 0.5)");
          gradient.addColorStop(1, "rgba(var(--primary-rgb), 1)");

          ctx.fillStyle = gradient;
          ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

          x += barWidth + 1;
        }
      };

      draw();
    };

    const handlePlay = () => {
      if (!audioCtx) setupVisualizer();
      if (audioCtx?.state === "suspended") audioCtx.resume();
    };

    const mediaElement = playerRef.current?.el?.querySelector("audio");
    mediaElement?.addEventListener("play", handlePlay);

    return () => {
      mediaElement?.removeEventListener("play", handlePlay);
      cancelAnimationFrame(animationId);
      if (audioCtx) {
        audioCtx.close();
      }
    };
  }, []);

  return (
    <div className="relative w-full h-full bg-zinc-950 flex flex-col items-center justify-center p-6 space-y-8 overflow-hidden rounded-xl">
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-t from-primary/30 to-transparent" />
        <canvas
          ref={canvasRef}
          width={800}
          height={400}
          className="w-full h-full"
        />
      </div>

      <div className="relative z-10 w-48 h-48 md:w-64 md:h-64 rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10 group">
        {poster ? (
          <Image
            src={poster.replace("=s220", "=s600")}
            alt={title}
            fill
            unoptimized
            className="object-cover transition-transform duration-700 group-hover:scale-110"
          />
        ) : (
          <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
            <Music size={80} className="text-primary/40 animate-pulse" />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      <div className="relative z-10 text-center space-y-2 max-w-xl px-4">
        <h2 className="text-xl md:text-2xl font-bold text-white line-clamp-1 truncate">
          {title}
        </h2>
        <p className="text-sm text-zinc-400 font-medium tracking-wide border border-white/5 py-1 px-3 rounded-full inline-block bg-white/5 backdrop-blur-sm">
          {mimeType}
        </p>
      </div>

      <div className="relative z-10 w-full max-w-2xl bg-zinc-900/50 backdrop-blur-lg border border-white/5 rounded-2xl p-4 shadow-xl">
        <MediaPlayer
          ref={playerRef}
          title={title}
          src={src}
          onCanPlay={() => setIsLoading(false)}
          className="w-full"
          crossOrigin="anonymous"
        >
          <MediaProvider />
          <DefaultAudioLayout icons={defaultLayoutIcons} />
        </MediaPlayer>
      </div>

      {isLoading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-zinc-950/50 backdrop-blur-sm">
          <Loader2 size={48} className="text-primary animate-spin" />
        </div>
      )}

      <style jsx global>{`
        :root {
          --primary-rgb:
            59, 130, 246; /* Default blue, will be overridden by theme if needed */
        }
        .dark {
          --primary-rgb: 59, 130, 246;
        }
      `}</style>
    </div>
  );
}

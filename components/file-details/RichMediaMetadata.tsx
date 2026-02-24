"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { Star, Calendar, User, Film } from "lucide-react";
import { motion } from "framer-motion";
import type { TMDBMetadata } from "@/lib/tmdb";
import { useTranslations } from "next-intl";

interface RichMediaMetadataProps {
  filename: string;
  onMetadataLoaded?: (metadata: TMDBMetadata) => void;
}

export default function RichMediaMetadata({
  filename,
  onMetadataLoaded,
}: RichMediaMetadataProps) {
  const [metadata, setMetadata] = useState<TMDBMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const t = useTranslations("InfoPanel");

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        setLoading(true);
        const res = await fetch(
          `/api/metadata?filename=${encodeURIComponent(filename)}`,
        );
        if (res.ok) {
          const data = await res.json();
          if (data) {
            setMetadata(data);
            onMetadataLoaded?.(data);
          }
        }
      } catch (err) {
        console.error("Failed to fetch media metadata", err);
      } finally {
        setLoading(false);
      }
    };

    fetchMetadata();
  }, [filename, onMetadataLoaded]);

  if (loading) {
    return (
      <div className="mt-8 pt-6 border-t animate-pulse">
        <div className="h-4 bg-secondary rounded w-1/4 mb-4"></div>
        <div className="flex gap-4">
          <div className="w-24 h-36 bg-secondary rounded"></div>
          <div className="flex-1">
            <div className="h-4 bg-secondary rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-secondary rounded w-1/2 mb-2"></div>
            <div className="h-12 bg-secondary rounded w-full"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!metadata) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-8 pt-6 border-t border-white/10"
    >
      <div className="flex justify-between items-center mb-4">
        <h4 className="text-sm font-bold text-muted-foreground uppercase flex items-center gap-2">
          <Film size={14} /> {t("mediaInfo")}
        </h4>
        {metadata.vote_average > 0 && (
          <div className="flex items-center gap-1 text-xs font-bold bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-full">
            <Star size={12} fill="currentColor" />{" "}
            {metadata.vote_average.toFixed(1)}
          </div>
        )}
      </div>

      <div className="flex gap-4 mb-6">
        {metadata.poster_path && (
          <div className="shrink-0 w-24 md:w-32 aspect-[2/3] rounded-lg overflow-hidden shadow-lg border border-white/10 relative">
            <Image
              src={metadata.poster_path}
              alt={metadata.title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 96px, 128px"
            />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="text-xl font-bold line-clamp-2 mb-1 leading-tight">
            {metadata.title}
          </h3>
          <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3 font-medium">
            {metadata.release_date && (
              <span className="flex items-center gap-1">
                <Calendar size={12} />{" "}
                {new Date(metadata.release_date).getFullYear()}
              </span>
            )}
            <span className="uppercase px-1.5 py-0.5 border border-muted-foreground/30 rounded text-[10px]">
              {metadata.media_type}
            </span>
          </div>
          <p className="text-sm text-foreground/80 line-clamp-4 leading-relaxed italic">
            &quot;{metadata.overview}&quot;
          </p>
        </div>
      </div>

      {metadata.cast && metadata.cast.length > 0 && (
        <div className="mb-6">
          <h5 className="text-xs font-bold text-muted-foreground uppercase mb-3 flex items-center gap-2">
            <User size={12} /> {t("cast")}
          </h5>
          <div className="flex overflow-x-auto gap-3 pb-2 no-scrollbar">
            {metadata.cast.map((person) => (
              <div key={person.id} className="shrink-0 w-16 text-center">
                <div className="w-16 h-16 rounded-full overflow-hidden mb-1 border border-white/5 bg-secondary/50 relative">
                  {person.profile_path ? (
                    <Image
                      src={person.profile_path}
                      alt={person.name}
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <User size={24} className="text-muted-foreground/30" />
                    </div>
                  )}
                </div>
                <p className="text-[10px] font-bold line-clamp-1 truncate">
                  {person.name}
                </p>
                <p className="text-[9px] text-muted-foreground line-clamp-1 truncate">
                  {person.character}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

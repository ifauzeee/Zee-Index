"use client";

import React from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  disabled?: boolean;
}

export default function PullToRefresh({
  onRefresh,
  children,
  disabled = false,
}: PullToRefreshProps) {
  const { pullDistance, isRefreshing, progress } = usePullToRefresh({
    onRefresh,
    disabled,
  });

  return (
    <div className="relative">
      {/* Pull indicator */}
      {(pullDistance > 0 || isRefreshing) && (
        <motion.div
          className="absolute top-0 left-0 right-0 flex items-center justify-center z-50 pointer-events-none"
          style={{
            height: pullDistance || 40,
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div
            className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 border border-primary/20 shadow-lg"
            style={{
              transform: `scale(${0.5 + progress * 0.5})`,
            }}
          >
            {isRefreshing ? (
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
            ) : (
              <motion.svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-primary"
                style={{
                  transform: `rotate(${progress * 180}deg)`,
                }}
              >
                <polyline points="7 13 12 18 17 13" />
                <line x1="12" y1="6" x2="12" y2="18" />
              </motion.svg>
            )}
          </div>
        </motion.div>
      )}

      {/* Content with offset */}
      <motion.div
        style={{
          transform:
            pullDistance > 0 ? `translateY(${pullDistance}px)` : undefined,
        }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        {children}
      </motion.div>
    </div>
  );
}

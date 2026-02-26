"use client";

import { useEffect, useRef, useCallback } from "react";
import { useAppStore } from "@/lib/store";

interface SSEEvent {
  id: string;
  type: string;
  message: string;
  severity: string;
  timestamp: number;
  itemName?: string;
  userEmail?: string;
}

interface UseSSEOptions {
  enabled?: boolean;
  onEvent?: (events: SSEEvent[]) => void;
}

export function useSSE({ enabled = true, onEvent }: UseSSEOptions = {}) {
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 10;
  const { addToast } = useAppStore();

  const processedIds = useRef(new Set<string>());

  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    try {
      const eventSource = new EventSource("/api/events");
      eventSourceRef.current = eventSource;

      eventSource.addEventListener("connected", () => {
        reconnectAttempts.current = 0;
      });

      eventSource.addEventListener("activity", (event) => {
        try {
          const notifications: SSEEvent[] = JSON.parse(event.data);

          const newEvents = notifications.filter((n) => {
            if (processedIds.current.has(n.id)) return false;
            processedIds.current.add(n.id);
            return true;
          });

          if (processedIds.current.size > 500) {
            const arr = Array.from(processedIds.current);
            processedIds.current = new Set(arr.slice(-200));
          }

          if (newEvents.length > 0) {
            onEvent?.(newEvents);

            newEvents.forEach((evt) => {
              if (
                evt.severity === "warning" ||
                evt.severity === "error" ||
                evt.severity === "critical"
              ) {
                addToast({
                  message: evt.message,
                  type: evt.severity === "warning" ? "info" : "error",
                });
              }
            });
          }
        } catch {}
      });

      eventSource.addEventListener("heartbeat", () => {});

      eventSource.onerror = () => {
        eventSource.close();
        eventSourceRef.current = null;

        if (reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.min(
            1000 * Math.pow(2, reconnectAttempts.current),
            30000,
          );
          reconnectAttempts.current++;

          reconnectTimeoutRef.current = setTimeout(() => {
            if (enabled) connect();
          }, delay);
        }
      };
    } catch {}
  }, [enabled, onEvent, addToast]);

  useEffect(() => {
    if (!enabled) return;

    connect();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [enabled, connect]);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, []);

  return { disconnect };
}

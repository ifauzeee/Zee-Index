"use client";

import { useEffect, useRef, useCallback } from "react";
import { useAppStore, NotificationItem } from "@/lib/store";
import { useSession } from "next-auth/react";
import { useQueryClient } from "@tanstack/react-query";

interface UseNotificationsOptions {
  enabled?: boolean;
}

export function useNotifications({
  enabled = true,
}: UseNotificationsOptions = {}) {
  const { data: session } = useSession();
  const { addNotification, addToast } = useAppStore();
  const queryClient = useQueryClient();

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

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
          const notifications = JSON.parse(event.data);

          const newEvents = notifications.filter((n: any) => {
            if (processedIds.current.has(n.id)) return false;
            processedIds.current.add(n.id);
            return true;
          });

          if (processedIds.current.size > 500) {
            const arr = Array.from(processedIds.current);
            processedIds.current = new Set(arr.slice(-200));
          }

          if (newEvents.length > 0) {
            newEvents.forEach((evt: any) => {
              const notifData: NotificationItem = {
                id: evt.id,
                message: evt.message,
                type: evt.severity === "warning" ? "error" : "info",
                timestamp: evt.timestamp,
                read: false,
              };

              addNotification(notifData);

              if (
                ["file:upload", "file:delete", "file:move"].includes(evt.type)
              ) {
                queryClient.invalidateQueries({ queryKey: ["files"] });
              }

              if (
                evt.severity === "warning" ||
                evt.severity === "error" ||
                evt.severity === "success"
              ) {
                addToast({
                  message: evt.message,
                  type: evt.severity === "warning" ? "error" : evt.severity,
                });
              }
            });
          }
        } catch (e) {
          console.error("Failed to parse SSE activity", e);
        }
      });

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
  }, [enabled, addNotification, addToast, queryClient]);

  useEffect(() => {
    if (!enabled || !session?.user) return;

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
  }, [enabled, session, connect]);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, []);

  return { disconnect };
}

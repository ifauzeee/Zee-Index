"use client";

import { useEffect, useRef, useCallback } from "react";
import { useAppStore, NotificationItem } from "@/lib/store";
import { useSession } from "next-auth/react";
import { useQueryClient } from "@tanstack/react-query";

interface UseNotificationsOptions {
  enabled?: boolean;
}

interface ActivityNotificationEvent {
  id: string;
  message: string;
  severity: "info" | "warning" | "error" | "success";
  timestamp: number;
  type: string;
}

function isActivityNotificationEvent(
  value: unknown,
): value is ActivityNotificationEvent {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    "message" in value &&
    "severity" in value &&
    "timestamp" in value &&
    "type" in value
  );
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
          const parsed: unknown = JSON.parse(event.data);
          const notifications = Array.isArray(parsed)
            ? parsed.filter(isActivityNotificationEvent)
            : [];

          const newEvents = notifications.filter((notification) => {
            if (processedIds.current.has(notification.id)) return false;
            processedIds.current.add(notification.id);
            return true;
          });

          if (processedIds.current.size > 500) {
            const arr = Array.from(processedIds.current);
            processedIds.current = new Set(arr.slice(-200));
          }

          if (newEvents.length > 0) {
            newEvents.forEach((eventItem) => {
              const notifData: NotificationItem = {
                id: eventItem.id,
                message: eventItem.message,
                type: eventItem.severity === "warning" ? "error" : "info",
                timestamp: eventItem.timestamp,
                read: false,
              };

              addNotification(notifData);

              if (
                ["file:upload", "file:delete", "file:move"].includes(
                  eventItem.type,
                )
              ) {
                queryClient.invalidateQueries({ queryKey: ["files"] });
              }

              if (
                eventItem.severity === "warning" ||
                eventItem.severity === "error" ||
                eventItem.severity === "success"
              ) {
                addToast({
                  message: eventItem.message,
                  type:
                    eventItem.severity === "warning"
                      ? "error"
                      : eventItem.severity,
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

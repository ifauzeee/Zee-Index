import { kv } from "@/lib/kv";
import { logger } from "@/lib/logger";

export type EventType =
  | "file:upload"
  | "file:delete"
  | "file:move"
  | "share:create"
  | "folder:update"
  | "storage:warning"
  | "system:alert";

export interface AppEvent {
  id: string;
  type: EventType;
  message: string;
  severity: "info" | "warning" | "error" | "success";
  payload?: Record<string, unknown>;
  userId?: string;
  userEmail?: string;
  itemName?: string;
  timestamp: number;
}

const REDIS_CHANNEL = "zee-index:events";

interface RedisSubscriber {
  subscribe: (channel: string, callback: (error: Error | null) => void) => void;
  on: (
    event: "message",
    callback: (channel: string, message: string) => void,
  ) => void;
}

interface RedisPublisher {
  publish: (channel: string, message: string) => Promise<number>;
}

interface RedisConstructor {
  new (url: string): RedisSubscriber & RedisPublisher;
}

class EventBus {
  private listeners = new Map<string, Set<(event: AppEvent) => void>>();
  private subscriber: RedisSubscriber | null = null;
  private publisher: RedisPublisher | null = null;
  private isConnected = false;
  private globalWithEdgeRuntime = globalThis as typeof globalThis & {
    EdgeRuntime?: unknown;
  };
  private isEdge =
    typeof globalThis !== "undefined" &&
    this.globalWithEdgeRuntime.EdgeRuntime !== undefined;

  constructor() {
    this.initRedis();
  }

  private initRedis() {
    if (this.isEdge || typeof window !== "undefined") return;

    const redisUrl = process.env.REDIS_URL;
    if (redisUrl) {
      try {
        const IORedis = require("ioredis") as RedisConstructor;
        this.subscriber = new IORedis(redisUrl);
        this.publisher = new IORedis(redisUrl);

        this.subscriber.subscribe(REDIS_CHANNEL, (err: Error | null) => {
          if (err) {
            logger.error(
              { err },
              "[EventBus] Failed to subscribe to Redis channel",
            );
          } else {
            this.isConnected = true;
            logger.info(
              "[EventBus] Subscribed to Redis channel for real-time events",
            );
          }
        });

        this.subscriber.on("message", (channel: string, message: string) => {
          if (channel === REDIS_CHANNEL) {
            try {
              const event: AppEvent = JSON.parse(message);
              this.notifyLocalListeners(event);
            } catch (err) {
              logger.error({ err }, "[EventBus] Failed to parse event message");
            }
          }
        });
      } catch (err) {
        logger.error({ err }, "[EventBus] Failed to initialize Redis Pub/Sub");
      }
    }
  }

  async emit(event: Omit<AppEvent, "id" | "timestamp">) {
    const fullEvent: AppEvent = {
      ...event,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };

    if (this.publisher && this.isConnected) {
      await this.publisher.publish(REDIS_CHANNEL, JSON.stringify(fullEvent));
    } else {
      this.notifyLocalListeners(fullEvent);
    }

    try {
      await kv.lpush("recent_events", JSON.stringify(fullEvent));
      await kv.ltrim("recent_events", 0, 99);
    } catch (err) {
      logger.error({ err }, "[EventBus] Failed to save event to history");
    }
  }

  private notifyLocalListeners(event: AppEvent) {
    this.listeners.forEach((callbacks) => {
      callbacks.forEach((cb) => cb(event));
    });
  }

  subscribe(listenerId: string, callback: (event: AppEvent) => void) {
    if (!this.listeners.has(listenerId)) {
      this.listeners.set(listenerId, new Set());
    }
    this.listeners.get(listenerId)!.add(callback);

    return () => {
      this.unsubscribe(listenerId, callback);
    };
  }

  unsubscribe(listenerId: string, callback: (event: AppEvent) => void) {
    const callbacks = this.listeners.get(listenerId);
    if (callbacks) {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        this.listeners.delete(listenerId);
      }
    }
  }
}

const globalForEventBus = globalThis as unknown as {
  eventBus: EventBus | undefined;
};

export const eventBus = globalForEventBus.eventBus ?? new EventBus();

if (process.env.NODE_ENV !== "production") {
  globalForEventBus.eventBus = eventBus;
}

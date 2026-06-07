import { kv } from "@/lib/kv";
import { logger } from "@/lib/logger";
import {
  appEventSchema,
  type AppEvent,
  type AppEventPayloadByType,
  type EventType,
} from "@/lib/telemetry";
import Redis from "ioredis";

const REDIS_CHANNEL = "zee-index:events";

class EventBus {
  private listeners = new Map<string, Set<(event: AppEvent) => void>>();
  private subscriber: Redis | null = null;
  private publisher: Redis | null = null;
  private isConnected = false;
  private lastRetryAt = 0;
  private readonly RETRY_COOLDOWN = 30_000;
  private globalWithEdgeRuntime = globalThis as typeof globalThis & {
    EdgeRuntime?: unknown;
  };
  private isEdge =
    typeof globalThis !== "undefined" &&
    this.globalWithEdgeRuntime.EdgeRuntime !== undefined;

  constructor() {
    // Connections will be lazily initialized when publishing or subscribing
  }

  private ensureSubscriber() {
    if (this.isEdge || typeof window !== "undefined") return;
    if (this.subscriber) return;

    const now = Date.now();
    if (now - this.lastRetryAt < this.RETRY_COOLDOWN) return;
    this.lastRetryAt = now;

    const redisUrl = process.env.REDIS_URL;
    if (redisUrl) {
      try {
        this.subscriber = new Redis(redisUrl);

        this.subscriber.on("error", (err: Error) => {
          logger.error({ err }, "[EventBus] Subscriber Redis connection error");
          this.isConnected = false;
        });

        this.subscriber.on("end", () => {
          this.isConnected = false;
          this.subscriber = null;
        });

        this.subscriber.subscribe(REDIS_CHANNEL, (err) => {
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
              const parsed = appEventSchema.safeParse(JSON.parse(message));
              if (parsed.success) {
                this.notifyLocalListeners(parsed.data);
              }
            } catch (err) {
              logger.error({ err }, "[EventBus] Failed to parse event message");
            }
          }
        });
      } catch (err) {
        logger.error(
          { err },
          "[EventBus] Failed to initialize Redis subscriber",
        );
        this.subscriber = null;
      }
    }
  }

  private ensurePublisher() {
    if (this.isEdge || typeof window !== "undefined") return;
    if (this.publisher) return;

    const now = Date.now();
    if (now - this.lastRetryAt < this.RETRY_COOLDOWN) return;
    this.lastRetryAt = now;

    const redisUrl = process.env.REDIS_URL;
    if (redisUrl) {
      try {
        this.publisher = new Redis(redisUrl);

        this.publisher.on("error", (err: Error) => {
          logger.error({ err }, "[EventBus] Publisher Redis connection error");
        });

        this.publisher.on("end", () => {
          this.publisher = null;
        });
      } catch (err) {
        logger.error(
          { err },
          "[EventBus] Failed to initialize Redis publisher",
        );
        this.publisher = null;
      }
    }
  }

  private async publish(fullEvent: AppEvent): Promise<void> {
    this.ensurePublisher();
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

  async emit<T extends EventType>(
    event: Omit<Extract<AppEvent, { type: T }>, "id" | "timestamp">,
  ): Promise<Extract<AppEvent, { type: T }>> {
    const fullEvent = appEventSchema.parse({
      ...event,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    });

    await this.publish(fullEvent);
    return fullEvent as Extract<AppEvent, { type: T }>;
  }

  async emitValidated(event: AppEvent): Promise<AppEvent> {
    const fullEvent = appEventSchema.parse(event);
    await this.publish(fullEvent);
    return fullEvent;
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

    this.ensureSubscriber();

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

export type { AppEventPayloadByType, EventType, AppEvent };

import { NextRequest } from "next/server";
import { kv } from "./kv";
import { RATE_LIMITS } from "./constants";
import { logger } from "./logger";

export type RateLimitType = keyof typeof RATE_LIMITS;

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

const RATELIMIT_PREFIX = "ratelimit";

const isEdgeRuntime =
  typeof globalThis !== "undefined" &&
  (globalThis as Record<string, unknown>).EdgeRuntime !== undefined;

const restUrl =
  process.env.KV_REST_API_URL ||
  process.env.UPSTASH_REDIS_REST_URL ||
  "";
const restToken =
  process.env.KV_REST_API_TOKEN ||
  process.env.UPSTASH_REDIS_REST_TOKEN ||
  "";

function getRestEndpoint(): string | null {
  if (!restUrl || !restToken) return null;
  if (!/^https?:\/\//i.test(restUrl)) return null;
  return restUrl.replace(/\/$/, "");
}

async function restIncrWithExpire(
  key: string,
  windowSeconds: number,
): Promise<number | null> {
  const endpoint = getRestEndpoint();
  if (!endpoint) return null;

  const payload = [
    ["INCR", key],
    ["EXPIRE", key, windowSeconds, "NX"],
  ];

  const response = await fetch(`${endpoint}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${restToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `REST KV error: ${response.status} ${response.statusText} ${text}`.trim(),
    );
  }

  const data: any[] = await response.json();
  const rawCount =
    (Array.isArray(data) && data[0]?.result !== undefined
      ? data[0].result
      : Array.isArray(data)
        ? data[0]
        : null) ?? null;

  const count = Number(rawCount);
  if (!Number.isFinite(count)) return null;
  return count;
}

export class KVRateLimiter {
  private readonly type: RateLimitType;
  private readonly limitCount: number;
  private readonly windowSeconds: number;

  constructor(type: RateLimitType) {
    this.type = type;
    this.limitCount = RATE_LIMITS[type].LIMIT;
    this.windowSeconds = RATE_LIMITS[type].WINDOW;
  }

  async check(identifier: string): Promise<RateLimitResult> {
    const key = `${RATELIMIT_PREFIX}:${this.type}:${identifier}`;
    const now = Date.now();

    try {
      let currentCount: number | null = null;

      if (isEdgeRuntime) {
        try {
          currentCount = await restIncrWithExpire(key, this.windowSeconds);
        } catch (error) {
          logger.error(
            { err: error, type: this.type, identifier },
            "REST rate limit check failed",
          );
        }
      }

      if (currentCount === null) {
        currentCount = await kv.incr(key);

        if (currentCount === 1) {
          await kv.expire(key, this.windowSeconds);
        }
      }

      const reset = now + this.windowSeconds * 1000;

      const remaining = Math.max(0, this.limitCount - currentCount);
      const success = currentCount <= this.limitCount;

      return {
        success,
        limit: this.limitCount,
        remaining,
        reset,
      };
    } catch (error) {
      logger.error(
        { err: error, type: this.type, identifier },
        "Rate limit check failed",
      );

      return {
        success: true,
        limit: this.limitCount,
        remaining: this.limitCount - 1,
        reset: now + this.windowSeconds * 1000,
      };
    }
  }
}

export const ratelimit = new KVRateLimiter("API");
export const downloadLimiter = new KVRateLimiter("DOWNLOAD");
export const authLimiter = new KVRateLimiter("AUTH");
export const adminLimiter = new KVRateLimiter("ADMIN");

export async function checkRateLimit(
  request: NextRequest,
  type: RateLimitType = "API",
  identifier?: string,
): Promise<RateLimitResult> {
  let finalId = identifier;

  if (!finalId) {
    const forwardedFor = request.headers.get("x-forwarded-for");
    finalId = forwardedFor ? forwardedFor.split(",")[0].trim() : "127.0.0.1";
  }

  let limiter: KVRateLimiter;
  switch (type) {
    case "DOWNLOAD":
      limiter = downloadLimiter;
      break;
    case "AUTH":
      limiter = authLimiter;
      break;
    case "ADMIN":
      limiter = adminLimiter;
      break;
    case "API":
    default:
      limiter = ratelimit;
  }

  return await limiter.check(finalId);
}

export function createRateLimitResponse(result: RateLimitResult) {
  return {
    headers: {
      "X-RateLimit-Limit": result.limit.toString(),
      "X-RateLimit-Remaining": result.remaining.toString(),
      "X-RateLimit-Reset": result.reset.toString(),
    },
  };
}

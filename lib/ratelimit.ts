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
      const currentCount = await kv.incr(key);


      if (currentCount === 1) {
        await kv.expire(key, this.windowSeconds);
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
      logger.error({ err: error, type: this.type, identifier }, "Rate limit check failed");

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

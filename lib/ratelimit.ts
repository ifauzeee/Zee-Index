import { NextRequest } from "next/server";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

class LocalRateLimiter {
  private store = new Map<string, RateLimitEntry>();
  private readonly maxRequests: number;
  private readonly windowMs: number;
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(maxRequests: number, windowSeconds: number) {
    this.maxRequests = maxRequests;
    this.windowMs = windowSeconds * 1000;
    this.startCleanup();
  }

  private startCleanup() {
    if (this.cleanupTimer) return;

    this.cleanupTimer = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.store.entries()) {
        if (entry.resetAt < now) {
          this.store.delete(key);
        }
      }
    }, 60_000);

    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }

  async check(identifier: string): Promise<RateLimitResult> {
    const now = Date.now();
    const entry = this.store.get(identifier);

    if (!entry || entry.resetAt < now) {
      const newEntry: RateLimitEntry = {
        count: 1,
        resetAt: now + this.windowMs,
      };
      this.store.set(identifier, newEntry);

      return {
        success: true,
        limit: this.maxRequests,
        remaining: this.maxRequests - 1,
        reset: newEntry.resetAt,
      };
    }

    entry.count++;

    const success = entry.count <= this.maxRequests;

    return {
      success,
      limit: this.maxRequests,
      remaining: Math.max(0, this.maxRequests - entry.count),
      reset: entry.resetAt,
    };
  }

  async limit(identifier: string): Promise<RateLimitResult> {
    return this.check(identifier);
  }

  getStats() {
    return {
      activeIdentifiers: this.store.size,
      maxRequests: this.maxRequests,
      windowMs: this.windowMs,
    };
  }
}

export const ratelimit = new LocalRateLimiter(100, 10);
export const downloadLimiter = new LocalRateLimiter(50, 60);
export const adminLimiter = new LocalRateLimiter(100, 10);

/**
 * Check rate limit for a request
 */
export async function checkRateLimit(
  request: NextRequest,
  type: "general" | "download" = "general",
  identifier?: string,
): Promise<RateLimitResult> {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const ip = forwardedFor ? forwardedFor.split(",")[0].trim() : "127.0.0.1";

  const finalId = identifier || ip;

  if (identifier?.startsWith("admin_")) {
    return await adminLimiter.check(finalId);
  }

  const limiter = type === "download" ? downloadLimiter : ratelimit;
  return await limiter.check(finalId);
}

/**
 * Rate limit middleware helper
 */
export function createRateLimitResponse(result: RateLimitResult) {
  return {
    headers: {
      "X-RateLimit-Limit": result.limit.toString(),
      "X-RateLimit-Remaining": result.remaining.toString(),
      "X-RateLimit-Reset": result.reset.toString(),
    },
  };
}

export function getRateLimitStats() {
  return {
    general: ratelimit.getStats(),
    download: downloadLimiter.getStats(),
    admin: adminLimiter.getStats(),
  };
}

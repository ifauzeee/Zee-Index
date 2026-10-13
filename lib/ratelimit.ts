import { NextRequest } from "next/server";
import { kv } from "./kv";
import { RATE_LIMITS } from "./constants";
import { logger } from "./logger";
import { getClientIp } from "./client-ip";

export type RateLimitType = keyof typeof RATE_LIMITS;

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

const RATELIMIT_PREFIX = "ratelimit";
const CIRCUIT_BREAKER_FAILURE_THRESHOLD = 3;
const CIRCUIT_BREAKER_WINDOW_MS = 60 * 1000;
const CIRCUIT_BREAKER_PROBE_INTERVAL_MS = 5 * 1000;

interface CircuitBreakerState {
  failures: number[];
  isOpen: boolean;
  openedAt: number | null;
  nextProbeAt: number;
}

const circuitBreakers = new Map<RateLimitType, CircuitBreakerState>();

function getCircuitBreakerState(type: RateLimitType): CircuitBreakerState {
  let state = circuitBreakers.get(type);

  if (!state) {
    state = {
      failures: [],
      isOpen: false,
      openedAt: null,
      nextProbeAt: 0,
    };
    circuitBreakers.set(type, state);
  }

  return state;
}

function shouldShortCircuit(type: RateLimitType, now: number): boolean {
  const state = getCircuitBreakerState(type);
  if (!state.isOpen) return false;

  if (now >= state.nextProbeAt) {
    state.nextProbeAt = now + CIRCUIT_BREAKER_PROBE_INTERVAL_MS;
    return false;
  }

  return true;
}

function recordRateLimitSuccess(type: RateLimitType) {
  const state = getCircuitBreakerState(type);
  state.failures = [];
  state.isOpen = false;
  state.openedAt = null;
  state.nextProbeAt = 0;
}

function recordRateLimitFailure(type: RateLimitType, now: number): boolean {
  const state = getCircuitBreakerState(type);
  state.failures = state.failures.filter(
    (failureAt) => now - failureAt <= CIRCUIT_BREAKER_WINDOW_MS,
  );
  state.failures.push(now);

  const shouldOpen = state.failures.length >= CIRCUIT_BREAKER_FAILURE_THRESHOLD;
  const openedNow = shouldOpen && !state.isOpen;

  if (shouldOpen) {
    state.isOpen = true;
    state.openedAt = state.openedAt ?? now;
    state.nextProbeAt = now + CIRCUIT_BREAKER_PROBE_INTERVAL_MS;
  }

  return openedNow;
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
    const now = Date.now();
    // Fixed windows get their own key. incr and expire are two calls, so a
    // crash between them used to leave a counter without a TTL that blocked
    // the identifier forever; a per-window key stops counting once the window
    // ends whether or not the TTL was set (Z2-19).
    const windowIndex = Math.floor(now / (this.windowSeconds * 1000));
    const key = `${RATELIMIT_PREFIX}:${this.type}:${identifier}:${windowIndex}`;
    const reset = (windowIndex + 1) * this.windowSeconds * 1000;

    if (shouldShortCircuit(this.type, now)) {
      return {
        success: false,
        limit: this.limitCount,
        remaining: 0,
        reset,
      };
    }

    try {
      const currentCount = await kv.incr(key);
      if (currentCount === 1) {
        await kv.expire(key, this.windowSeconds);
      }

      const remaining = Math.max(0, this.limitCount - currentCount);
      const success = currentCount <= this.limitCount;
      recordRateLimitSuccess(this.type);

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

      if (recordRateLimitFailure(this.type, now)) {
        logger.error(
          { type: this.type },
          "Rate limit circuit breaker opened after repeated failures",
        );
      }

      if (shouldShortCircuit(this.type, now)) {
        return {
          success: false,
          limit: this.limitCount,
          remaining: 0,
          reset,
        };
      }

      return {
        success: true,
        limit: this.limitCount,
        remaining: this.limitCount - 1,
        reset,
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
    finalId = getClientIp(request.headers);
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

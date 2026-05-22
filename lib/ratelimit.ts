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

const isEdgeRuntime =
  typeof globalThis !== "undefined" &&
  (globalThis as Record<string, unknown>).EdgeRuntime !== undefined;

const restUrl =
  process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "";
const restToken =
  process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "";

interface RestPipelineResult {
  result?: unknown;
}

function isRestPipelineResult(value: unknown): value is RestPipelineResult {
  return typeof value === "object" && value !== null && "result" in value;
}

function getRestEndpoint(): string | null {
  if (!restUrl || !restToken) return null;
  if (!/^https?:\/\//i.test(restUrl)) return null;
  return restUrl.replace(/\/$/, "");
}

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

export function resetRateLimitCircuitBreakers() {
  circuitBreakers.clear();
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

  const data = (await response.json()) as Array<RestPipelineResult | unknown>;
  const rawCount =
    (Array.isArray(data) && isRestPipelineResult(data[0])
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
    const reset = now + this.windowSeconds * 1000;

    if (shouldShortCircuit(this.type, now)) {
      return {
        success: false,
        limit: this.limitCount,
        remaining: 0,
        reset,
      };
    }

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

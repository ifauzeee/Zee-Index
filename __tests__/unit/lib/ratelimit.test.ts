import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { kv } from "@/lib/kv";
import {
  createRateLimitResponse,
  KVRateLimiter,
  resetRateLimitCircuitBreakers,
} from "@/lib/ratelimit";
import type { RateLimitResult } from "@/lib/ratelimit";

vi.mock("@/lib/kv", () => ({
  kv: {
    incr: vi.fn(),
    expire: vi.fn(),
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
  },
}));

describe("lib/ratelimit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetRateLimitCircuitBreakers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("createRateLimitResponse", () => {
    it("creates response headers with correct values", () => {
      const result: RateLimitResult = {
        success: true,
        limit: 100,
        remaining: 99,
        reset: 1700000000000,
      };

      const response = createRateLimitResponse(result);
      expect(response.headers["X-RateLimit-Limit"]).toBe("100");
      expect(response.headers["X-RateLimit-Remaining"]).toBe("99");
      expect(response.headers["X-RateLimit-Reset"]).toBe("1700000000000");
    });

    it("handles zero remaining correctly", () => {
      const result: RateLimitResult = {
        success: false,
        limit: 50,
        remaining: 0,
        reset: 1700000000000,
      };

      const response = createRateLimitResponse(result);
      expect(response.headers["X-RateLimit-Remaining"]).toBe("0");
    });

    it("converts numbers to strings", () => {
      const result: RateLimitResult = {
        success: true,
        limit: 500,
        remaining: 499,
        reset: Date.now() + 60000,
      };

      const response = createRateLimitResponse(result);
      expect(typeof response.headers["X-RateLimit-Limit"]).toBe("string");
      expect(typeof response.headers["X-RateLimit-Remaining"]).toBe("string");
      expect(typeof response.headers["X-RateLimit-Reset"]).toBe("string");
    });
  });

  describe("RateLimitResult interface", () => {
    it("has all required fields", () => {
      const result: RateLimitResult = {
        success: true,
        limit: 100,
        remaining: 99,
        reset: Date.now(),
      };

      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("limit");
      expect(result).toHaveProperty("remaining");
      expect(result).toHaveProperty("reset");
    });
  });

  describe("KVRateLimiter circuit breaker", () => {
    it("fails closed after repeated KV failures and recovers after a successful probe", async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-05-22T00:00:00.000Z"));

      const mockedKv = vi.mocked(kv);
      mockedKv.incr.mockRejectedValue(new Error("Redis unavailable"));

      const limiter = new KVRateLimiter("AUTH");

      await expect(
        limiter.check("login:user@example.com"),
      ).resolves.toMatchObject({
        success: true,
        remaining: 19,
      });
      await expect(
        limiter.check("login:user@example.com"),
      ).resolves.toMatchObject({
        success: true,
        remaining: 19,
      });
      await expect(
        limiter.check("login:user@example.com"),
      ).resolves.toMatchObject({
        success: false,
        remaining: 0,
      });

      mockedKv.incr.mockClear();

      await expect(
        limiter.check("login:other@example.com"),
      ).resolves.toMatchObject({
        success: false,
        remaining: 0,
      });
      expect(mockedKv.incr).not.toHaveBeenCalled();

      vi.advanceTimersByTime(5_000);
      mockedKv.incr.mockResolvedValueOnce(1);
      mockedKv.expire.mockResolvedValueOnce(1);

      await expect(
        limiter.check("login:other@example.com"),
      ).resolves.toMatchObject({
        success: true,
        remaining: 19,
      });
    });
  });
});

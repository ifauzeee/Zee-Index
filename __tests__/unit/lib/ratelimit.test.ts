import { describe, it, expect } from "vitest";
import { createRateLimitResponse } from "@/lib/ratelimit";
import type { RateLimitResult } from "@/lib/ratelimit";

describe("lib/ratelimit", () => {
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
});

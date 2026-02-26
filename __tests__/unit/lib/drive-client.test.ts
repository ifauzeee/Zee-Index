import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./auth", () => ({
  getAccessToken: vi.fn().mockResolvedValue("test-token"),
  invalidateAccessToken: vi.fn(),
}));

import { fetchWithRetry } from "@/lib/drive/client";

describe("lib/drive/client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  describe("fetchWithRetry", () => {
    it("returns response on success", async () => {
      const mockResponse = { ok: true, status: 200 };
      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const result = await fetchWithRetry("https://api.test.com", {
        headers: { Authorization: "Bearer token" },
      });

      expect(result).toEqual(mockResponse);
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it("returns 404 without retrying", async () => {
      const mockResponse = { ok: false, status: 404 };
      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const result = await fetchWithRetry(
        "https://api.test.com",
        { headers: { Authorization: "Bearer token" } },
        3,
        10,
      );

      expect(result.status).toBe(404);
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it("retries on 500 errors", async () => {
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({ ok: false, status: 500 })
        .mockResolvedValueOnce({ ok: false, status: 500 })
        .mockResolvedValueOnce({ ok: true, status: 200 });

      const result = await fetchWithRetry(
        "https://api.test.com",
        { headers: { Authorization: "Bearer token" } },
        5,
        1,
      );

      expect(result.ok).toBe(true);
      expect(fetch).toHaveBeenCalledTimes(3);
    });

    it("retries on 429 rate limit errors", async () => {
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({ ok: false, status: 429 })
        .mockResolvedValueOnce({ ok: true, status: 200 });

      const result = await fetchWithRetry(
        "https://api.test.com",
        { headers: { Authorization: "Bearer token" } },
        3,
        1,
      );

      expect(result.ok).toBe(true);
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    it("returns non-retryable error responses directly", async () => {
      const mockResponse = { ok: false, status: 403 };
      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const result = await fetchWithRetry(
        "https://api.test.com",
        { headers: { Authorization: "Bearer token" } },
        3,
        1,
      );

      expect(result.status).toBe(403);
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it("throws after exhausting retries on network error", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

      await expect(
        fetchWithRetry(
          "https://api.test.com",
          { headers: { Authorization: "Bearer token" } },
          2,
          1,
        ),
      ).rejects.toThrow("Network error");

      expect(fetch).toHaveBeenCalledTimes(2);
    });

    it("throws final error message after exhausting all retries", async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });

      await expect(
        fetchWithRetry(
          "https://api.test.com",
          { headers: { Authorization: "Bearer token" } },
          2,
          1,
        ),
      ).rejects.toThrow();
    });
  });
});

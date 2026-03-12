import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/kv", () => ({
  kv: {
    get: vi.fn(),
    set: vi.fn().mockResolvedValue("OK"),
    del: vi.fn(),
  },
}));

vi.mock("@/lib/config", () => ({
  getAppCredentials: vi.fn(),
}));

import { getAccessToken, invalidateAccessToken } from "@/lib/drive/auth";
import { kv } from "@/lib/kv";
import { getAppCredentials } from "@/lib/config";
import { REDIS_KEYS } from "@/lib/constants";

describe("lib/drive/auth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("invalidateAccessToken", () => {
    it("deletes the access token from KV", async () => {
      await invalidateAccessToken();
      expect(kv.del).toHaveBeenCalledWith(REDIS_KEYS.ACCESS_TOKEN);
    });
  });

  describe("getAccessToken", () => {
    it("returns cached token if available", async () => {
      (kv.get as any).mockResolvedValue("cached-access-token");

      const token = await getAccessToken();
      expect(token).toBe("cached-access-token");
      expect(kv.get).toHaveBeenCalledWith(REDIS_KEYS.ACCESS_TOKEN);
    });

    it("fetches new token when cache is empty", async () => {
      (kv.get as any).mockResolvedValue(null);
      (getAppCredentials as any).mockResolvedValue({
        clientId: "test-client-id",
        clientSecret: "test-client-secret",
        refreshToken: "test-refresh-token",
      });

      const mockResponse = {
        ok: true,
        json: async () => ({
          access_token: "new-access-token",
          expires_in: 3600,
        }),
      };
      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const token = await getAccessToken();
      expect(token).toBe("new-access-token");
      expect(kv.set).toHaveBeenCalledWith(
        REDIS_KEYS.ACCESS_TOKEN,
        "new-access-token",
        expect.any(Object),
      );
    });

    it("throws error when app is not configured", async () => {
      (kv.get as any).mockResolvedValue(null);
      (getAppCredentials as any).mockResolvedValue(null);

      await expect(getAccessToken()).rejects.toThrow();
    });

    it("throws error on OAuth failure", async () => {
      (kv.get as any).mockResolvedValue(null);
      (getAppCredentials as any).mockResolvedValue({
        clientId: "id",
        clientSecret: "secret",
        refreshToken: "token",
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({
          error: "invalid_client",
          error_description: "Client not authorized",
        }),
      });

      await expect(getAccessToken()).rejects.toThrow("Client not authorized");
    });

    it("clears credentials on invalid_grant error", async () => {
      (kv.get as any).mockResolvedValue(null);
      (getAppCredentials as any).mockResolvedValue({
        clientId: "id",
        clientSecret: "secret",
        refreshToken: "token",
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({
          error: "invalid_grant",
        }),
      });

      await expect(getAccessToken()).rejects.toThrow();
    });

    it("handles KV cache errors gracefully", async () => {
      (kv.get as any).mockRejectedValue(new Error("Redis down"));
      (getAppCredentials as any).mockResolvedValue({
        clientId: "id",
        clientSecret: "secret",
        refreshToken: "token",
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          access_token: "fallback-token",
          expires_in: 3600,
        }),
      });

      const token = await getAccessToken();
      expect(token).toBe("fallback-token");
    });
  });
});

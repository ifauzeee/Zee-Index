import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  mockGetAppConfig,
  mockFindUnique,
  mockCompare,
  mockGetLocalStorageAuthSecret,
  mockSign,
} = vi.hoisted(() => ({
  mockGetAppConfig: vi.fn(),
  mockFindUnique: vi.fn(),
  mockCompare: vi.fn(),
  mockGetLocalStorageAuthSecret: vi.fn(),
  mockSign: vi.fn(),
}));

vi.mock("@/lib/app-config", () => ({
  getAppConfig: mockGetAppConfig,
  isHashedLocalStoragePassword: (value: string) => value.startsWith("$2b$"),
}));

vi.mock("@/lib/db", () => ({
  db: {
    protectedFolder: {
      findUnique: mockFindUnique,
    },
  },
}));

vi.mock("bcryptjs", () => ({
  default: {
    compare: mockCompare,
  },
}));

vi.mock("@/lib/local-auth-secret", () => ({
  getLocalStorageAuthSecret: mockGetLocalStorageAuthSecret,
}));

vi.mock("jose", () => ({
  SignJWT: class {
    setProtectedHeader() {
      return this;
    }
    setIssuedAt() {
      return this;
    }
    setExpirationTime() {
      return this;
    }
    sign = mockSign;
  },
}));

vi.mock("@/lib/ratelimit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ success: true }),
  createRateLimitResponse: vi.fn().mockReturnValue({ headers: new Headers() }),
  authLimiter: { check: vi.fn().mockResolvedValue({ success: true }) },
}));

import { POST } from "@/app/api/auth/local/unlock/route";

describe("app/api/auth/local/unlock route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetLocalStorageAuthSecret.mockReturnValue(new Uint8Array([1, 2, 3]));
    mockFindUnique.mockResolvedValue(null);
    mockSign.mockResolvedValue("signed-token");
  });

  it("supports hashed local storage passwords from app config", async () => {
    mockGetAppConfig.mockResolvedValue({
      localStorageAuthEnabled: true,
      localStoragePassword: "$2b$10$hashed-password",
    });
    mockCompare.mockResolvedValue(true);

    const response = await POST(
      new NextRequest("http://localhost:3000/api/auth/local/unlock", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password: "plain-password" }),
      }),
    );

    expect(mockCompare).toHaveBeenCalledWith(
      "plain-password",
      "$2b$10$hashed-password",
    );
    expect(response.status).toBe(200);
  });

  it("keeps compatibility with legacy plaintext config passwords", async () => {
    mockGetAppConfig.mockResolvedValue({
      localStorageAuthEnabled: true,
      localStoragePassword: "legacy-password",
    });

    const response = await POST(
      new NextRequest("http://localhost:3000/api/auth/local/unlock", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password: "legacy-password" }),
      }),
    );

    expect(mockCompare).not.toHaveBeenCalled();
    expect(response.status).toBe(200);
  });
});

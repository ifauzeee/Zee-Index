import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockJwtVerify, mockGetLocalStorageAuthSecret } = vi.hoisted(() => ({
  mockJwtVerify: vi.fn(),
  mockGetLocalStorageAuthSecret: vi.fn(),
}));

vi.mock("@/lib/api-middleware", () => ({
  createPublicRoute: (handler: (ctx: any) => Promise<Response>) => {
    return async (request: NextRequest) => handler({ request });
  },
}));

vi.mock("jose", () => ({
  jwtVerify: mockJwtVerify,
}));

vi.mock("@/lib/local-auth-secret", () => ({
  getLocalStorageAuthSecret: mockGetLocalStorageAuthSecret,
}));

import { GET } from "@/app/api/auth/local/check/route";

function makeRequest(cookie?: string) {
  return new NextRequest("http://localhost:3000", {
    headers: cookie ? { Cookie: `local_storage_token=${cookie}` } : undefined,
  });
}

describe("app/api/auth/local/check route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetLocalStorageAuthSecret.mockReturnValue(
      new TextEncoder().encode("test-secret"),
    );
  });

  it("returns authenticated true when token is valid", async () => {
    mockJwtVerify.mockResolvedValue({ payload: {} });

    const response = await GET(makeRequest("valid-jwt-token"));

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.authenticated).toBe(true);
  });

  it("returns authenticated false when no cookie", async () => {
    const response = await GET(makeRequest());

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.authenticated).toBe(false);
  });

  it("returns authenticated false when no auth secret", async () => {
    mockGetLocalStorageAuthSecret.mockReturnValue(null);

    const response = await GET(makeRequest("some-token"));

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.authenticated).toBe(false);
  });

  it("returns authenticated false when JWT verification fails", async () => {
    mockJwtVerify.mockRejectedValue(new Error("Invalid token"));

    const response = await GET(makeRequest("expired-token"));

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.authenticated).toBe(false);
  });
});

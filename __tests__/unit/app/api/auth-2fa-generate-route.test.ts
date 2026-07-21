import { describe, expect, it, vi, beforeEach } from "vitest";

const { mockAuthenticator, mockQrCode, mockKvSet } = vi.hoisted(() => ({
  mockAuthenticator: { generateSecret: vi.fn(), keyuri: vi.fn() },
  mockQrCode: { toDataURL: vi.fn() },
  mockKvSet: vi.fn(),
}));

vi.mock("@/lib/api-middleware", () => ({
  createUserRoute: (handler: (ctx: any) => Promise<Response>) => {
    return async () =>
      handler({
        session: { user: { email: "user@test.com" } },
      });
  },
}));

vi.mock("otplib", () => ({
  authenticator: mockAuthenticator,
}));

vi.mock("qrcode", () => ({
  default: mockQrCode,
}));

vi.mock("@/lib/kv", () => ({
  kv: { set: mockKvSet },
}));

import { POST } from "@/app/api/auth/2fa/generate/route";

describe("app/api/auth/2fa/generate route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthenticator.generateSecret.mockReturnValue("test-secret-12345");
    mockAuthenticator.keyuri.mockReturnValue("otpauth://totp/test");
    mockQrCode.toDataURL.mockResolvedValue("data:image/png;base64,qrdata");
    mockKvSet.mockResolvedValue("OK");
  });

  it("generates 2FA secret and QR code", async () => {
    const response = await POST(new Request("http://localhost:3000"));

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.secret).toBe("test-secret-12345");
    expect(data.qrCodeDataURL).toBe("data:image/png;base64,qrdata");
    expect(mockKvSet).toHaveBeenCalledWith(
      "2fa:secret:temp:user@test.com",
      "test-secret-12345",
      { ex: 300 },
    );
  });

  it("returns 500 on error", async () => {
    mockAuthenticator.generateSecret.mockImplementation(() => {
      throw new Error("Generation failed");
    });

    const response = await POST(new Request("http://localhost:3000"));

    expect(response.status).toBe(500);
  });
});

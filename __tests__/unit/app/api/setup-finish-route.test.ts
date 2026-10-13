import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  mockInvalidateAccessToken,
  mockIsAppConfigured,
  mockExistsSync,
  mockReadFileSync,
  mockWriteFileSync,
} = vi.hoisted(() => ({
  mockInvalidateAccessToken: vi.fn(),
  mockIsAppConfigured: vi.fn(),
  mockExistsSync: vi.fn(),
  mockReadFileSync: vi.fn(),
  mockWriteFileSync: vi.fn(),
}));

vi.mock("@/lib/api-middleware", () => ({
  createPublicRoute: (
    handler: (context: {
      request: NextRequest;
      body: Record<string, string>;
    }) => Promise<Response>,
  ) => {
    return async (request: NextRequest) => {
      const body = (await request.json()) as Record<string, string>;
      return handler({ request, body });
    };
  },
}));

vi.mock("fs", () => ({
  default: {
    existsSync: mockExistsSync,
    readFileSync: mockReadFileSync,
    writeFileSync: mockWriteFileSync,
  },
  existsSync: mockExistsSync,
  readFileSync: mockReadFileSync,
  writeFileSync: mockWriteFileSync,
}));

vi.mock("@/lib/drive", () => ({
  invalidateAccessToken: mockInvalidateAccessToken,
}));

vi.mock("@/lib/config", () => ({
  isAppConfigured: mockIsAppConfigured,
}));

import {
  POST,
  escapeEnvValue,
  writeEnvValue,
  hasPersistedSetupConfig,
  isAllowedSetupRequestOrigin,
} from "@/app/api/setup/finish/route";

describe("app/api/setup/finish route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAppConfigured.mockResolvedValue(false);
    process.env.SETUP_TOKEN = "operator-setup-token-123";
    mockExistsSync.mockReturnValue(false);
    mockReadFileSync.mockReturnValue("");
    mockWriteFileSync.mockImplementation(() => {});
    mockInvalidateAccessToken.mockResolvedValue(undefined);
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ refresh_token: "refresh-token-value" }),
    }) as unknown as typeof fetch;
  });

  it("accepts only same-origin setup requests", () => {
    const request = new NextRequest("http://localhost:3000/api/setup/finish", {
      method: "POST",
      headers: { origin: "http://localhost:3000" },
    });

    expect(isAllowedSetupRequestOrigin(request)).toBe(true);
    expect(
      isAllowedSetupRequestOrigin(
        new NextRequest("http://localhost:3000/api/setup/finish", {
          method: "POST",
          headers: { origin: "https://evil.example.com" },
        }),
      ),
    ).toBe(false);
  });

  it("detects when setup credentials already exist in .env", () => {
    expect(
      hasPersistedSetupConfig(
        [
          'GOOGLE_CLIENT_ID="id"',
          'GOOGLE_CLIENT_SECRET="secret"',
          'GOOGLE_REFRESH_TOKEN="refresh"',
          'NEXT_PUBLIC_ROOT_FOLDER_ID="root"',
        ].join("\n"),
      ),
    ).toBe(true);
  });

  it("strips dangerous line breaks from env values", () => {
    expect(escapeEnvValue('abc"\nNEXTAUTH_SECRET=hijack')).toBe(
      'abc\\"NEXTAUTH_SECRET=hijack',
    );
  });

  it("escapes double quotes so they cannot close the .env value", () => {
    expect(escapeEnvValue('a"b')).toBe('a\\"b');
  });

  it("writes a value containing $& to .env verbatim", () => {
    // $& is the "whole match" token in String.replace; a replacer function
    // must be used so it is not substituted.
    const written = writeEnvValue("KEY=first", "KEY", "a$&b");
    expect(written).toBe('KEY="a$&b"');
  });

  it("appends the key when it is not already present", () => {
    const written = writeEnvValue("OTHER=1", "KEY", "a$&b");
    expect(written).toContain('KEY="a$&b"');
  });

  it("rejects cross-origin setup submissions", async () => {
    const response = await POST(
      new NextRequest("http://localhost:3000/api/setup/finish", {
        method: "POST",
        headers: {
          origin: "https://evil.example.com",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          clientId: "client-id",
          clientSecret: "client-secret",
          authCode: "auth-code",
          redirectUri: "http://localhost:3000/setup",
          rootFolderId: "root-folder",
        }),
      }),
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "Forbidden" });
  });

  it("rejects repeated setup when credentials are already persisted", async () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(
      [
        'GOOGLE_CLIENT_ID="id"',
        'GOOGLE_CLIENT_SECRET="secret"',
        'GOOGLE_REFRESH_TOKEN="refresh"',
        'NEXT_PUBLIC_ROOT_FOLDER_ID="root"',
      ].join("\n"),
    );

    const response = await POST(
      new NextRequest("http://localhost:3000/api/setup/finish", {
        method: "POST",
        headers: {
          origin: "http://localhost:3000",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          clientId: "client-id",
          clientSecret: "client-secret",
          authCode: "auth-code",
          redirectUri: "http://localhost:3000/setup",
          rootFolderId: "root-folder",
        }),
      }),
    );

    expect(response.status).toBe(403);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("does not return secrets when writing .env succeeds", async () => {
    const response = await POST(
      new NextRequest("http://localhost:3000/api/setup/finish", {
        method: "POST",
        headers: {
          origin: "http://localhost:3000",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          clientId: "client-id",
          clientSecret: "client-secret",
          authCode: "auth-code",
          redirectUri: "http://localhost:3000/setup",
          rootFolderId: "root-folder",
          setupToken: "operator-setup-token-123",
        }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        restartNeeded: true,
        manualConfigNeeded: false,
        manualConfigData: null,
      }),
    );
  });

  describe("first-run setup token (Z2-26)", () => {
    function finish(setupToken?: string) {
      return POST(
        new NextRequest("http://localhost:3000/api/setup/finish", {
          method: "POST",
          headers: {
            origin: "http://localhost:3000",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            clientId: "client-id",
            clientSecret: "client-secret",
            authCode: "auth-code",
            redirectUri: "http://localhost:3000/setup",
            rootFolderId: "attacker-folder",
            ...(setupToken === undefined ? {} : { setupToken }),
          }),
        }),
      );
    }

    it.each([undefined, "", "wrong-token-value-0000"])(
      "refuses to configure an unconfigured instance with token %j",
      async (token) => {
        const response = await finish(token);

        expect(response.status).toBe(403);
        expect(global.fetch).not.toHaveBeenCalled();
        expect(mockWriteFileSync).not.toHaveBeenCalled();
      },
    );

    it("derives a stable token from NEXTAUTH_SECRET when SETUP_TOKEN is unset", async () => {
      delete process.env.SETUP_TOKEN;
      process.env.NEXTAUTH_SECRET = "n".repeat(32);
      const { getSetupToken } = await import("@/lib/setup-token");

      const token = getSetupToken();

      expect(token).toMatch(/^[0-9a-f]{24}$/);
      expect(getSetupToken()).toBe(token);
      expect((await finish(token)).status).toBe(200);
    });
  });
});

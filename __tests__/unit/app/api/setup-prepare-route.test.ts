import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { mockIsAppConfigured, mockWriteFileSync } = vi.hoisted(() => ({
  mockIsAppConfigured: vi.fn(),
  mockWriteFileSync: vi.fn(),
}));

vi.mock("@/lib/api-middleware", () => ({
  createPublicRoute:
    (
      handler: (ctx: {
        request: NextRequest;
        body: Record<string, string>;
        session: null;
      }) => Promise<Response>,
    ) =>
    async (request: NextRequest) =>
      handler({
        request,
        body: (await request.json()) as Record<string, string>,
        session: null,
      }),
}));
vi.mock("fs", () => {
  const fsMock = {
    existsSync: () => false,
    readFileSync: () => "",
    writeFileSync: mockWriteFileSync,
  };
  return { default: fsMock, ...fsMock };
});
vi.mock("@/lib/config", () => ({ isAppConfigured: mockIsAppConfigured }));
vi.mock("@/lib/drive", () => ({ invalidateAccessToken: vi.fn() }));

import { POST as prepare } from "@/app/api/setup/prepare/route";
import { POST as finish } from "@/app/api/setup/finish/route";

const ORIGIN = "http://localhost:3000";

function post(
  handler: (request: NextRequest) => Promise<Response>,
  path: string,
  body: object,
) {
  return handler(
    new NextRequest(`${ORIGIN}${path}`, {
      method: "POST",
      headers: { origin: ORIGIN, "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

describe("setup prepare → finish", () => {
  const saved = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAppConfigured.mockResolvedValue(false);
    process.env.SETUP_TOKEN = "operator-setup-token-123";
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
    delete process.env.NEXT_PUBLIC_ROOT_FOLDER_ID;
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ refresh_token: "refresh-token-value" }),
    }) as unknown as typeof fetch;
  });

  afterEach(() => {
    process.env = { ...saved };
  });

  it("keeps the typed values on the server and redeems them once by state", async () => {
    const prepared = await post(prepare, "/api/setup/prepare", {
      clientId: "typed-id",
      clientSecret: "typed-secret",
      rootFolderId: "typed-root",
      setupToken: "operator-setup-token-123",
    });
    expect(prepared.status).toBe(200);
    const { state } = (await prepared.json()) as { state: string };
    // Only an opaque state goes back to the browser.
    expect(state).toMatch(/^[0-9a-f-]{36}$/);

    const finished = await post(finish, "/api/setup/finish", {
      state,
      authCode: "auth-code",
      redirectUri: `${ORIGIN}/setup`,
    });

    expect(finished.status).toBe(200);
    const tokenRequest = (global.fetch as ReturnType<typeof vi.fn>).mock
      .calls[0][1] as { body: URLSearchParams };
    expect(tokenRequest.body.get("client_id")).toBe("typed-id");
    expect(tokenRequest.body.get("client_secret")).toBe("typed-secret");
    expect(mockWriteFileSync.mock.calls[0][1]).toContain(
      'NEXT_PUBLIC_ROOT_FOLDER_ID="typed-root"',
    );

    // A state can be used once.
    const replay = await post(finish, "/api/setup/finish", {
      state,
      authCode: "auth-code",
      redirectUri: `${ORIGIN}/setup`,
    });
    expect(replay.status).toBe(400);
  });

  it("refuses to prepare without a valid setup token", async () => {
    const response = await post(prepare, "/api/setup/prepare", {
      clientSecret: "typed-secret",
      setupToken: "wrong",
    });

    expect(response.status).toBe(403);
  });

  it("rejects an unknown state", async () => {
    const response = await post(finish, "/api/setup/finish", {
      state: "00000000-0000-0000-0000-000000000000",
      authCode: "auth-code",
      redirectUri: `${ORIGIN}/setup`,
    });

    expect(response.status).toBe(400);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("refuses cross-origin prepare requests", async () => {
    const response = await prepare(
      new NextRequest(`${ORIGIN}/api/setup/prepare`, {
        method: "POST",
        headers: {
          origin: "https://evil.example.com",
          "content-type": "application/json",
        },
        body: JSON.stringify({ setupToken: "operator-setup-token-123" }),
      }),
    );

    expect(response.status).toBe(403);
  });
});

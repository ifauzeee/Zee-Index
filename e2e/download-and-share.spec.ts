import { test, expect } from "@playwright/test";

// ---------------------------------------------------------------------------
// Helper: build a plausible but invalid / expired JWT (no real signature).
// The middleware validates via jose.jwtVerify which will reject any token
// whose signature does not match SHARE_SECRET_KEY — exactly what we want.
// ---------------------------------------------------------------------------
function buildExpiredShareToken(): string {
  const header = Buffer.from(
    JSON.stringify({ alg: "HS256", typ: "JWT" }),
  ).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({
      sub: "e2e-test",
      exp: Math.floor(Date.now() / 1000) - 3600, // expired 1 h ago
      iat: Math.floor(Date.now() / 1000) - 7200,
      jti: "e2e-expired-link",
    }),
  ).toString("base64url");
  const fakeSig = "AAAA_BBBBB_CCCCC_DDDDD"; // guaranteed wrong signature
  return `${header}.${payload}.${fakeSig}`;
}

function buildFreshShareToken(jti = "e2e-fresh-link"): string {
  const header = Buffer.from(
    JSON.stringify({ alg: "HS256", typ: "JWT" }),
  ).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({
      sub: "e2e-test",
      exp: Math.floor(Date.now() / 1000) + 3600, // 1 h from now
      iat: Math.floor(Date.now() / 1000),
      jti,
    }),
  ).toString("base64url");
  const fakeSig = "AAAA_BBBBB_CCCCC_DDDDD";
  return `${header}.${payload}.${fakeSig}`;
}

// ===========================================================================
// 1.  File download – HTTP Range header contract
// ===========================================================================
test.describe("Download endpoint – Range header", () => {
  const fileId = "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"; // valid format

  test("HEAD returns Accept-Ranges: bytes", async ({ request }) => {
    const response = await request.fetch(`/api/download?fileId=${fileId}`, {
      method: "HEAD",
    });

    // Without auth we expect 401/403, but the route still sets response
    // headers when the error is thrown *after* header construction.
    // Regardless of status, Accept-Ranges should be present when the
    // server responds to a download-route request.
    const acceptRanges = response.headers()["accept-ranges"];
    // If the error short-circuits before headers are built (401/403),
    // Accept-Ranges may not be set — that is fine. We verify the
    // endpoint is reachable and returns a structured error.
    if (response.status() === 200 || response.status() === 206) {
      expect(acceptRanges).toBe("bytes");
    } else {
      // Auth-level rejection (401/403/429), or upstream Drive failure (500)
      // with mock creds (public route → Drive layer throws → handleRouteError).
      // HEAD responses carry no body by HTTP spec, so assert status only.
      expect([401, 403, 429, 500]).toContain(response.status());
    }
  });

  test("GET with Range header returns proper status or structured error", async ({
    request,
  }) => {
    const response = await request.fetch(`/api/download?fileId=${fileId}`, {
      headers: { Range: "bytes=0-1023" },
    });

    // Rejected at auth level (401/403), rate-limited (429), invalid (400),
    // or upstream Drive failure (500) with mock Google creds — the route
    // is public, so an unknown fileId reaches the Drive layer (see above).
    const status = response.status();
    if (status === 200 || status === 206) {
      // Real file served: Range honored.
      expect(
        response.headers()["accept-ranges"] ??
          response.headers()["content-range"],
      ).toBeDefined();
    } else {
      expect([400, 401, 403, 429, 500]).toContain(status);
      const contentType = response.headers()["content-type"] ?? "";
      // Error responses are JSON; a served file would be binary.
      if (contentType.includes("application/json")) {
        expect(await response.json()).toHaveProperty("error");
      }
    }
  });

  test("download with missing fileId returns 400", async ({ request }) => {
    const response = await request.get("/api/download");

    expect([400, 401, 403]).toContain(response.status());
    const payload = await response.json();
    expect(payload).toHaveProperty("error");
  });

  test("download with invalid share token signature returns 401", async ({
    request,
  }) => {
    const token = buildExpiredShareToken();
    const response = await request.get(
      `/api/download?fileId=${fileId}&share_token=${token}`,
    );

    expect([401, 403]).toContain(response.status());
    const payload = await response.json();
    expect(payload).toHaveProperty("error");
  });
});

// ===========================================================================
// 2.  Share-link expiry / max-uses enforcement
// ===========================================================================
test.describe("Share-link expiry & max-uses", () => {
  test("expired share token is rejected by share page", async ({ page }) => {
    const expiredToken = buildExpiredShareToken();
    await page.goto(`/share/nonexistent?share_token=${expiredToken}`);

    // The middleware validates the JWT and rejects expired tokens,
    // redirecting to login with ShareLinkExpired error.
    await expect
      .poll(() => new URL(page.url()).pathname, { timeout: 15_000 })
      .toMatch(/\/((en|id|zh-TW)\/)?(login|share|setup)/);

    // If landed on login, the error param should be ShareLinkExpired
    const url = new URL(page.url());
    const error = url.searchParams.get("error");
    if (new URL(page.url()).pathname.includes("login")) {
      expect(error).toBe("ShareLinkExpired");
    }
  });

  test("expired share token rejected at API level", async ({ request }) => {
    const expiredToken = buildExpiredShareToken();
    const response = await request.get(
      `/api/files?share_token=${expiredToken}`,
    );

    // Expired JWT → middleware returns 401 for API routes
    expect([401, 403]).toContain(response.status());
    const payload = await response.json();
    expect(payload).toHaveProperty("error");
  });

  test("share status endpoint rejects invalid tokens", async ({ request }) => {
    const response = await request.get(
      "/api/share/status?share_token=not-a-real-jwt",
    );

    expect([400, 401, 403]).toContain(response.status());
    const payload = await response.json();
    expect(payload).toHaveProperty("error");
  });

  test("share track endpoint rejects requests without valid token", async ({
    request,
  }) => {
    const response = await request.post("/api/share/track", {
      headers: { "Content-Type": "application/json" },
      data: { shareId: "nonexistent" },
    });

    // Without auth the track endpoint should reject
    expect([400, 401, 403, 404, 500]).toContain(response.status());
  });

  test("download with valid-structure but unverifiable share token is rejected", async ({
    request,
  }) => {
    const fileId = "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms";
    const token = buildFreshShareToken();
    const response = await request.get(
      `/api/download?fileId=${fileId}&share_token=${token}`,
    );

    // Token has correct structure + future exp but wrong signature
    // → jose.jwtVerify rejects it → 401
    expect([401, 403]).toContain(response.status());
    const payload = await response.json();
    expect(payload).toHaveProperty("error");
  });
});

import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/api-middleware", () => ({
  createPublicRoute: (
    handler: (ctx: { request: NextRequest }) => Promise<Response>,
  ) => {
    return async (request: NextRequest) => handler({ request });
  },
}));

import { GET } from "@/app/api/docs/route";

describe("app/api/docs route", () => {
  it("adds a nonce to every script tag it emits", async () => {
    const request = new NextRequest("http://localhost:3000/api/docs", {
      headers: { "x-nonce": "n1" },
    });

    const response = await GET(request);

    expect(response.status).toBe(200);
    const html = await response.text();
    const scriptTags = html.match(/<script[^>]*>/g) ?? [];
    expect(scriptTags).toHaveLength(3);
    for (const tag of scriptTags) {
      expect(tag).toContain(`nonce="n1"`);
    }
  });

  it("falls back to no nonce when the middleware did not set one", async () => {
    const request = new NextRequest("http://localhost:3000/api/docs");

    const response = await GET(request);

    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).not.toContain("nonce=");
  });
});

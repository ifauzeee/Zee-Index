import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/api-middleware", () => ({
  createPublicRoute: (handler: (ctx: any) => Promise<Response>) => {
    return async () => handler({});
  },
}));

import { POST } from "@/app/api/auth/local/logout/route";

describe("app/api/auth/local/logout route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("clears local storage auth cookie", async () => {
    const response = await POST(new NextRequest("http://localhost:3000"));

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);

    // Verify the cookie was cleared
    const setCookie = response.headers.get("Set-Cookie");
    expect(setCookie).toContain("local_storage_token=");
    expect(setCookie).toContain("Max-Age=0");
  });
});

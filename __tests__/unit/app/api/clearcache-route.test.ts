import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/api-middleware", () => ({
  createAdminRoute: (
    handler: (ctx: { request: NextRequest }) => Promise<Response>,
  ) => {
    return async (request: NextRequest) => handler({ request });
  },
}));

vi.mock("next/cache", () => ({
  revalidateTag: vi.fn(),
}));

import { GET } from "@/app/api/clearcache/route";

function makeRequest(target: string | null) {
  const url = target
    ? `http://localhost:3000/api/clearcache?target=${target}`
    : "http://localhost:3000/api/clearcache";
  return new NextRequest(url);
}

describe("app/api/clearcache route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("clears files cache when target is files", async () => {
    const response = await GET(makeRequest("files"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      message: "Cache files telah dibersihkan.",
    });
  });

  it("returns 400 for invalid target", async () => {
    const response = await GET(makeRequest("invalid"));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      success: false,
      message: "Invalid cache target.",
    });
  });

  it("returns 400 when target is missing", async () => {
    const response = await GET(makeRequest(null));

    expect(response.status).toBe(400);
  });
});

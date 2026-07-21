import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const { mockTrackPageView } = vi.hoisted(() => ({
  mockTrackPageView: vi.fn(),
}));

type RouteHandler = (ctx: {
  body?: unknown;
  request: NextRequest;
}) => Promise<Response>;

const handlers = vi.hoisted(() => ({
  POST: undefined as unknown as RouteHandler,
}));

vi.mock("@/lib/api-middleware", () => ({
  createPublicRoute: (handler: RouteHandler, _opts?: unknown) => {
    handlers.POST = handler;
    return async (request: NextRequest) => {
      const raw = await request.json().catch(() => undefined);
      const parsed = (
        await import("@/app/api/admin/analytics/track/route")
      ).analyticsTrackRequestSchema?.safeParse?.(raw);
      if (parsed && !parsed.success) {
        return NextResponse.json({ ok: false }, { status: 400 });
      }
      return handler({ body: parsed?.data ?? raw, request });
    };
  },
}));

vi.mock("@/lib/analyticsTracker", () => ({
  trackPageView: mockTrackPageView,
}));

vi.mock("@/lib/telemetry", () => ({
  analyticsTrackRequestSchema: {
    safeParse: (data: unknown) => ({
      success: true,
      data: data as { path: string; referrer?: string },
    }),
  },
}));

import { POST } from "@/app/api/admin/analytics/track/route";

describe("app/api/admin/analytics/track POST", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTrackPageView.mockResolvedValue(undefined);
  });

  it("tracks a page view and returns ok", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/admin/analytics/track",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          path: "/test",
          referrer: "https://example.com",
        }),
      },
    );
    const response = await POST(request);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ ok: true });
    expect(mockTrackPageView).toHaveBeenCalled();
  });

  it("returns 500 on error", async () => {
    mockTrackPageView.mockRejectedValue(new Error("tracking failed"));
    const request = new NextRequest(
      "http://localhost:3000/api/admin/analytics/track",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ path: "/test" }),
      },
    );
    const response = await POST(request);
    expect(response.status).toBe(500);
  });
});

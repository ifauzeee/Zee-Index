import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { mockSubscribe, mockEventBus } = vi.hoisted(() => ({
  mockSubscribe: vi.fn().mockReturnValue(vi.fn()),
  mockEventBus: {
    subscribe: vi.fn().mockReturnValue(vi.fn()),
  },
}));

vi.mock("@/lib/api-middleware", () => ({
  createUserRoute: (
    handler: (ctx: {
      request: NextRequest;
      session: { user: { email: string; role: string } };
    }) => Promise<Response>,
  ) => {
    return async (request: NextRequest) =>
      handler({
        request,
        session: { user: { email: "user@example.com", role: "USER" } },
      });
  },
}));

vi.mock("@/lib/events/eventBus", () => ({
  eventBus: mockEventBus,
}));

import { GET } from "@/app/api/events/route";

describe("app/api/events route", () => {
  it("returns an SSE stream response", async () => {
    const request = new NextRequest("http://localhost:3000/api/events");

    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("text/event-stream");
    expect(response.headers.get("Cache-Control")).toBe(
      "no-cache, no-transform",
    );
    expect(response.headers.get("Connection")).toBe("keep-alive");
    expect(response.headers.get("X-Accel-Buffering")).toBe("no");
  });
});

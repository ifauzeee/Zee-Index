import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { z } from "zod";

const { mockListIncidents, mockUpdateIncidentStatus } = vi.hoisted(() => ({
  mockListIncidents: vi.fn(),
  mockUpdateIncidentStatus: vi.fn(),
}));

type RouteHandler = (ctx: {
  request: NextRequest;
  query?: Record<string, unknown>;
  body?: unknown;
  session?: { user: { email?: string } };
}) => Promise<Response>;

const handlers = vi.hoisted(() => ({
  GET: undefined as unknown as RouteHandler,
  PATCH: undefined as unknown as RouteHandler,
}));

vi.mock("@/lib/api-middleware", () => ({
  createAdminRoute: (handler: RouteHandler) => {
    return async (request: NextRequest) => {
      try {
        if (request.method === "PATCH") {
          const raw = await request.json().catch(() => undefined);
          return handler({
            body: raw,
            request,
            session: { user: { email: "admin@example.com" } },
          });
        }
        const params = Object.fromEntries(request.nextUrl.searchParams);
        return handler({ query: params, request });
      } catch (e) {
        return new Response(JSON.stringify({ error: String(e) }), {
          status: 500,
        });
      }
    };
  },
}));

vi.mock("@/lib/incident-monitor", () => ({
  incidentStatusSchema: z.enum(["open", "acknowledged", "resolved"]),
  listIncidents: mockListIncidents,
  updateIncidentStatus: mockUpdateIncidentStatus,
}));

import { GET, PATCH } from "@/app/api/admin/incidents/route";

describe("app/api/admin/incidents GET", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListIncidents.mockResolvedValue({
      incidents: [{ id: "1", title: "Test", status: "open" }],
      total: 1,
      openCount: 1,
    });
  });

  it("returns incidents with default pagination", async () => {
    const response = await GET(
      new NextRequest("http://localhost:3000/api/admin/incidents"),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty("incidents");
    expect(body).toHaveProperty("total", 1);
    expect(body).toHaveProperty("openCount", 1);
    expect(body.incidents).toEqual([
      { id: "1", title: "Test", status: "open" },
    ]);
  });
});

describe("app/api/admin/incidents PATCH", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateIncidentStatus.mockResolvedValue({
      id: "1",
      status: "resolved",
    });
  });

  it("updates incident status", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/admin/incidents",
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: "1", status: "resolved" }),
      },
    );
    const response = await PATCH(request);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({
      success: true,
      incident: { id: "1", status: "resolved" },
    });
  });

  it("returns 404 when incident not found", async () => {
    mockUpdateIncidentStatus.mockResolvedValue(null);
    const request = new NextRequest(
      "http://localhost:3000/api/admin/incidents",
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: "nonexistent", status: "resolved" }),
      },
    );
    const response = await PATCH(request);
    expect(response.status).toBe(404);
  });
});

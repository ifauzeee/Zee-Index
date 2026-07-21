import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { mockEvaluateIncidentRules } = vi.hoisted(() => ({
  mockEvaluateIncidentRules: vi.fn(),
}));

vi.mock("@/lib/api-middleware", () => ({
  createAdminRoute: (
    handler: (context: { request: NextRequest }) => Promise<Response>,
  ) => {
    return async (request: NextRequest) => {
      try {
        return await handler({ request });
      } catch (e) {
        return new Response(JSON.stringify({ error: String(e) }), {
          status: 500,
        });
      }
    };
  },
}));

vi.mock("@/lib/incident-monitor", () => ({
  evaluateIncidentRules: mockEvaluateIncidentRules,
}));

import { POST } from "@/app/api/admin/incidents/evaluate/route";

describe("app/api/admin/incidents/evaluate POST", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEvaluateIncidentRules.mockResolvedValue({
      created: 1,
      resolved: 0,
      totalOpen: 2,
    });
  });

  it("evaluates incident rules and returns summary", async () => {
    const response = await POST(
      new NextRequest("http://localhost:3000/api/admin/incidents/evaluate", {
        method: "POST",
      }),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({
      success: true,
      summary: { created: 1, resolved: 0, totalOpen: 2 },
    });
  });

  it("propagates error when evaluation fails", async () => {
    mockEvaluateIncidentRules.mockRejectedValue(new Error("evaluation failed"));
    const response = await POST(
      new NextRequest("http://localhost:3000/api/admin/incidents/evaluate", {
        method: "POST",
      }),
    );
    expect(response.status).toBe(500);
  });
});

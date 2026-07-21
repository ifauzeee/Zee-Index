import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { mockListFileRevisions } = vi.hoisted(() => ({
  mockListFileRevisions: vi.fn(),
}));

vi.mock("@/lib/api-middleware", () => ({
  createAdminRoute: (handler: (ctx: any) => Promise<Response>) => {
    return async (request: NextRequest) =>
      handler({ request, params: { fileId: "test-file-id" } });
  },
}));

vi.mock("@/lib/drive", () => ({
  listFileRevisions: mockListFileRevisions,
}));

import { GET } from "@/app/api/files/[fileId]/revisions/route";

function makeRequest() {
  return new NextRequest(
    "http://localhost:3000/api/files/test-file-id/revisions",
  );
}

describe("app/api/files/[fileId]/revisions route", () => {
  it("returns file revisions", async () => {
    mockListFileRevisions.mockResolvedValue([
      { id: "rev-1", modifiedTime: "2026-01-01T00:00:00Z" },
      { id: "rev-2", modifiedTime: "2026-01-02T00:00:00Z" },
    ]);

    const response = await GET(makeRequest());

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveLength(2);
    expect(data[0].id).toBe("rev-1");
  });

  it("returns 500 on failure", async () => {
    mockListFileRevisions.mockRejectedValue(new Error("API error"));

    const response = await GET(makeRequest());

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe("Failed to fetch revisions");
  });
});

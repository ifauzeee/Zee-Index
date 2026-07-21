import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { mockSearchTMDB, mockCleanMediaTitle } = vi.hoisted(() => ({
  mockSearchTMDB: vi.fn(),
  mockCleanMediaTitle: vi.fn(),
}));

vi.mock("@/lib/api-middleware", () => ({
  createPublicRoute: (
    handler: (ctx: { request: NextRequest }) => Promise<Response>,
  ) => {
    return async (request: NextRequest) => handler({ request });
  },
}));

vi.mock("@/lib/tmdb", () => ({
  searchTMDB: mockSearchTMDB,
}));

vi.mock("@/lib/utils", () => ({
  cleanMediaTitle: mockCleanMediaTitle,
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

import { GET } from "@/app/api/metadata/route";

function makeRequest(filename: string | null) {
  const url = filename
    ? `http://localhost:3000/api/metadata?filename=${encodeURIComponent(filename)}`
    : "http://localhost:3000/api/metadata";
  return new NextRequest(url);
}

describe("app/api/metadata route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCleanMediaTitle.mockReturnValue({ title: "Inception", year: 2010 });
  });

  it("returns metadata for a valid filename", async () => {
    mockSearchTMDB.mockResolvedValue({
      title: "Inception",
      year: 2010,
      poster: "https://example.com/poster.jpg",
    });

    const response = await GET(makeRequest("Inception.2010.1080p.mkv"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      title: "Inception",
      year: 2010,
      poster: "https://example.com/poster.jpg",
    });
    expect(mockCleanMediaTitle).toHaveBeenCalledWith(
      "Inception.2010.1080p.mkv",
    );
  });

  it("returns 400 when filename is missing", async () => {
    const response = await GET(makeRequest(null));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Filename is required",
    });
  });

  it("returns 500 on TMDB error", async () => {
    mockSearchTMDB.mockRejectedValue(new Error("tmdb down"));

    const response = await GET(makeRequest("test.mkv"));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Internal server error",
    });
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockQueryRaw, mockKvSet, mockKvGet, mockKvDel, mockGetAccessToken } =
  vi.hoisted(() => ({
    mockQueryRaw: vi.fn(),
    mockKvSet: vi.fn(),
    mockKvGet: vi.fn(),
    mockKvDel: vi.fn(),
    mockGetAccessToken: vi.fn(),
  }));

vi.mock("@/lib/db", () => ({
  db: {
    $queryRaw: mockQueryRaw,
  },
}));

vi.mock("@/lib/kv", () => ({
  kv: {
    set: mockKvSet,
    get: mockKvGet,
    del: mockKvDel,
  },
}));

vi.mock("@/lib/drive", () => ({
  getAccessToken: mockGetAccessToken,
}));

vi.mock("@/lib/config", () => ({
  getRootFolderId: vi.fn(),
}));

import {
  checkCacheHealth,
  checkDatabaseHealth,
  checkGoogleDriveHealth,
  summarizeLatencies,
} from "@/lib/services/health-service";
import { getRootFolderId } from "@/lib/config";

describe("lib/services/health-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQueryRaw.mockResolvedValue([{ "?column?": 1 }]);
    mockKvSet.mockResolvedValue("OK");
    mockKvGet.mockResolvedValue("ok");
    mockKvDel.mockResolvedValue(1);
    mockGetAccessToken.mockResolvedValue("drive-token");
    vi.mocked(getRootFolderId).mockResolvedValue("root-folder-id");
  });

  it("reports database health from a real query", async () => {
    const result = await checkDatabaseHealth();

    expect(result.status).toBe("healthy");
    expect(result.latency).toBeGreaterThanOrEqual(0);
    expect(result.checkedAt).toMatch(/T/);
  });

  it("reports cache backend and latency", async () => {
    const result = await checkCacheHealth();

    expect(result.status).toBe("healthy");
    expect(result.backend).toBe(process.env.REDIS_URL ? "redis" : "memory");
    expect(mockKvDel).toHaveBeenCalledTimes(1);
  });

  it("marks Google Drive as not configured when the root folder is missing", async () => {
    vi.mocked(getRootFolderId).mockResolvedValueOnce("");

    const result = await checkGoogleDriveHealth();

    expect(result.status).toBe("not_configured");
    expect(result.quota).toBeNull();
  });

  it("includes quota data when requested", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: "root-folder-id" }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            storageQuota: {
              usage: "100",
              limit: "1000",
            },
          }),
          { status: 200 },
        ),
      );

    vi.stubGlobal("fetch", fetchMock);

    const result = await checkGoogleDriveHealth({ includeQuota: true });

    expect(result.status).toBe("healthy");
    expect(result.quota).toEqual({ usage: 100, limit: 1000 });

    vi.unstubAllGlobals();
  });

  it("summarizes dependency latencies without random values", () => {
    const summary = summarizeLatencies(
      {
        database: {
          status: "healthy",
          latency: 12,
          checkedAt: new Date().toISOString(),
        },
        cache: {
          status: "healthy",
          latency: 7,
          checkedAt: new Date().toISOString(),
          backend: "memory",
        },
        google_drive: {
          status: "healthy",
          latency: 29,
          checkedAt: new Date().toISOString(),
          quota: null,
        },
      },
      54,
    );

    expect(summary.totalCheckMs).toBe(54);
    expect(summary.averageDependencyMs).toBe(16);
    expect(summary.fastestDependency).toEqual({ name: "cache", latency: 7 });
    expect(summary.slowestDependency).toEqual({
      name: "google_drive",
      latency: 29,
    });
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockFindUnique, mockUpsert, mockKvGet, mockKvSet } = vi.hoisted(() => ({
  mockFindUnique: vi.fn(),
  mockUpsert: vi.fn(),
  mockKvGet: vi.fn(),
  mockKvSet: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    adminConfig: {
      findUnique: mockFindUnique,
      upsert: mockUpsert,
    },
  },
}));

vi.mock("@/lib/kv", () => ({
  kv: {
    get: mockKvGet,
    set: mockKvSet,
  },
}));

import {
  DEFAULT_APP_CONFIG,
  getAppConfig,
  getPublicAppConfig,
  updateAppConfig,
} from "@/lib/app-config";

describe("lib/app-config", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindUnique.mockResolvedValue(null);
    mockUpsert.mockResolvedValue(null);
    mockKvGet.mockResolvedValue(null);
    mockKvSet.mockResolvedValue("OK");
  });

  it("returns normalized defaults when no config is stored", async () => {
    const result = await getAppConfig();

    expect(result).toEqual(DEFAULT_APP_CONFIG);
    expect(mockKvSet).toHaveBeenCalledWith(
      "zee-index:config",
      DEFAULT_APP_CONFIG,
    );
  });

  it("normalizes legacy partial config from the database", async () => {
    mockFindUnique.mockResolvedValueOnce({
      value: JSON.stringify({
        appName: "Custom Name",
        hideAuthor: true,
      }),
    });

    const result = await getAppConfig();

    expect(result).toEqual({
      ...DEFAULT_APP_CONFIG,
      appName: "Custom Name",
      hideAuthor: true,
    });
  });

  it("merges partial updates instead of overwriting existing config", async () => {
    mockFindUnique.mockResolvedValueOnce({
      value: JSON.stringify({
        ...DEFAULT_APP_CONFIG,
        appName: "Existing Name",
        logoUrl: "https://example.com/logo.png",
      }),
    });

    const result = await updateAppConfig({
      disableGuestLogin: true,
    });

    expect(result).toEqual({
      ...DEFAULT_APP_CONFIG,
      appName: "Existing Name",
      logoUrl: "https://example.com/logo.png",
      disableGuestLogin: true,
    });
    expect(mockUpsert).toHaveBeenCalledWith({
      where: { key: "zee-index:config" },
      update: { value: JSON.stringify(result) },
      create: { key: "zee-index:config", value: JSON.stringify(result) },
    });
    expect(mockKvSet).toHaveBeenLastCalledWith("zee-index:config", result);
  });

  it("returns only public fields from the shared config source", async () => {
    mockKvGet.mockResolvedValueOnce({
      ...DEFAULT_APP_CONFIG,
      hideAuthor: true,
      disableGuestLogin: true,
      appName: "Hidden",
    });

    const result = await getPublicAppConfig();

    expect(result).toEqual({
      hideAuthor: true,
      disableGuestLogin: true,
    });
  });

  it("normalizes empty app names back to the default label", async () => {
    mockFindUnique.mockResolvedValueOnce({
      value: JSON.stringify({
        appName: "",
      }),
    });

    const result = await getAppConfig();

    expect(result.appName).toBe(DEFAULT_APP_CONFIG.appName);
  });
});

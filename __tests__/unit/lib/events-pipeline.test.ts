import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ActivityLog } from "@/lib/activityLogger";

const { mockKv, mockEmitValidated } = vi.hoisted(() => ({
  mockKv: {
    zadd: vi.fn().mockResolvedValue(1),
    zremrangebyscore: vi.fn().mockResolvedValue(0),
    zrange: vi.fn().mockResolvedValue([]),
    del: vi.fn().mockResolvedValue(1),
  },
  mockEmitValidated: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/kv", () => ({
  kv: mockKv,
}));

vi.mock("@/lib/events/eventBus", () => ({
  eventBus: {
    emitValidated: mockEmitValidated,
  },
}));

import {
  EVENT_PIPELINE_KEYS,
  publishActivityEvent,
  publishPipelineEvent,
} from "@/lib/events/pipeline";

describe("lib/events/pipeline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("stores pipeline events without realtime publish when disabled", async () => {
    const event = await publishPipelineEvent({
      id: "evt-analytics-1",
      timestamp: 1700000000000,
      type: "analytics:pageview",
      message: "Page viewed: /docs",
      severity: "info",
      payload: {
        path: "/docs",
        referrer: "",
        visitorId: "v-1",
        ip: "127.0.0.1",
      },
      category: "analytics",
      source: "analytics",
      publishRealtime: false,
    });

    expect(event?.type).toBe("analytics:pageview");
    expect(mockKv.zadd).toHaveBeenCalledWith(
      EVENT_PIPELINE_KEYS.eventStream,
      expect.objectContaining({
        score: 1700000000000,
      }),
    );
    expect(mockEmitValidated).not.toHaveBeenCalled();
  });

  it("maps activity logs to stream and realtime events", async () => {
    const log: ActivityLog = {
      id: "log-1",
      type: "DOWNLOAD",
      timestamp: 1700000001234,
      severity: "info",
      itemName: "movie.mp4",
      itemId: "file-1",
      userEmail: "admin@example.com",
      metadata: {
        fileId: "file-1",
        mimeType: "video/mp4",
        rangeRequest: false,
      },
    };

    await publishActivityEvent(log);

    expect(mockKv.zadd).toHaveBeenCalledWith(
      EVENT_PIPELINE_KEYS.activityLog,
      expect.objectContaining({
        score: 1700000001234,
      }),
    );
    expect(mockEmitValidated).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "log-1",
        type: "file:download",
        itemName: "movie.mp4",
      }),
    );
  });
});

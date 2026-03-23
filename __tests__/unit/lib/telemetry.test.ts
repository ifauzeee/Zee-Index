import { describe, expect, it } from "vitest";
import {
  analyticsTrackRequestSchema,
  appEventSchema,
  pageViewEventSchema,
  parseSchemaValue,
} from "@/lib/telemetry";

describe("lib/telemetry", () => {
  it("parses serialized page view events with the shared schema", () => {
    const parsed = parseSchemaValue(
      JSON.stringify({
        id: "evt-1",
        path: "/folder/test",
        timestamp: 123,
        visitorId: "visitor-1",
        ip: "127.0.0.1",
        userAgent: "UA",
        referrer: "",
        browser: "Chrome",
        os: "Windows",
        device: "Desktop",
      }),
      pageViewEventSchema,
    );

    expect(parsed).toEqual({
      id: "evt-1",
      path: "/folder/test",
      timestamp: 123,
      visitorId: "visitor-1",
      ip: "127.0.0.1",
      userAgent: "UA",
      referrer: "",
      browser: "Chrome",
      os: "Windows",
      device: "Desktop",
    });
  });

  it("normalizes analytics tracking requests", () => {
    const parsed = analyticsTrackRequestSchema.parse({
      path: "/share/demo",
    });

    expect(parsed).toEqual({
      path: "/share/demo",
      referrer: "",
    });
  });

  it("accepts typed event payloads for matching event types", () => {
    const result = appEventSchema.safeParse({
      id: "event-1",
      type: "file:move",
      message: "Moved file",
      severity: "info",
      timestamp: Date.now(),
      payload: {
        fileId: "file-1",
        sourceParentId: "folder-a",
        destinationParentId: "folder-b",
      },
    });

    expect(result.success).toBe(true);
  });

  it("rejects invalid typed event payloads", () => {
    const result = appEventSchema.safeParse({
      id: "event-1",
      type: "file:move",
      message: "Moved file",
      severity: "info",
      timestamp: Date.now(),
      payload: {
        fileId: 123,
      },
    });

    expect(result.success).toBe(false);
  });
});

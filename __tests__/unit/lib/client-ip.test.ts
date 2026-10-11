import { describe, expect, it } from "vitest";
import { getClientIp } from "@/lib/client-ip";

describe("lib/client-ip", () => {
  it("uses the hop added by the nearest proxy, not the client-supplied first hop", () => {
    expect(
      getClientIp(new Headers({ "x-forwarded-for": "6.6.6.6, 10.0.0.2" })),
    ).toBe("10.0.0.2");
  });

  it("keeps the last hop when the chain has more entries", () => {
    expect(
      getClientIp(
        new Headers({ "x-forwarded-for": "1.1.1.1, 2.2.2.2, 3.3.3.3" }),
      ),
    ).toBe("3.3.3.3");
  });

  it("ignores empty hops in the chain", () => {
    expect(
      getClientIp(new Headers({ "x-forwarded-for": "6.6.6.6, , 10.0.0.2" })),
    ).toBe("10.0.0.2");
  });

  it("falls back to x-real-ip when there is no x-forwarded-for", () => {
    expect(getClientIp(new Headers({ "x-real-ip": "1.2.3.4" }))).toBe(
      "1.2.3.4",
    );
  });

  it("falls back to the loopback address when no proxy header is present", () => {
    expect(getClientIp(new Headers())).toBe("127.0.0.1");
  });

  it("falls back to the loopback address when the proxy headers are blank", () => {
    expect(
      getClientIp(new Headers({ "x-forwarded-for": "  ", "x-real-ip": "  " })),
    ).toBe("127.0.0.1");
  });
});

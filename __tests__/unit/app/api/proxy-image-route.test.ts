import { gzipSync } from "zlib";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockSharp, mockToBuffer } = vi.hoisted(() => {
  const mockToBuffer = vi.fn();
  const pipeline = {
    resize: vi.fn(),
    webp: vi.fn(),
    toBuffer: mockToBuffer,
  };
  pipeline.resize.mockReturnValue(pipeline);
  pipeline.webp.mockReturnValue(pipeline);
  return { mockSharp: vi.fn(() => pipeline), mockToBuffer };
});

vi.mock("@/lib/api-middleware", () => ({
  createPublicRoute:
    (handler: (ctx: { request: NextRequest }) => Promise<Response>) =>
    (request: NextRequest) =>
      handler({ request }),
}));

vi.mock("sharp", () => ({
  default: mockSharp,
}));

import {
  GET,
  detectRasterFormat,
  isAllowedImageHost,
} from "@/app/api/proxy-image/route";

const SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>';
const PNG = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(16),
]);
const JPEG = Buffer.concat([
  Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
  Buffer.alloc(16),
]);

function proxyRequest(): NextRequest {
  return new NextRequest(
    "http://localhost/api/proxy-image?url=https%3A%2F%2Flh3.googleusercontent.com%2Fimg",
  );
}

function upstream(body: BodyInit | null, headers: Record<string, string>) {
  return new Response(body, { status: 200, headers });
}

describe("isAllowedImageHost", () => {
  it("accepts trusted Google image hosts and their subdomains", () => {
    expect(isAllowedImageHost("lh3.googleusercontent.com")).toBe(true);
    expect(isAllowedImageHost("drive.google.com")).toBe(true);
  });

  it("rejects lookalike hosts that only share the suffix text", () => {
    expect(isAllowedImageHost("evilgoogleusercontent.com")).toBe(false);
    expect(isAllowedImageHost("google.com.evil.example")).toBe(false);
  });
});

describe("detectRasterFormat", () => {
  it("recognizes every allowed raster format", () => {
    expect(detectRasterFormat(JPEG)).toBe("jpeg");
    expect(detectRasterFormat(PNG)).toBe("png");
    expect(
      detectRasterFormat(
        Buffer.concat([Buffer.from("GIF89a"), Buffer.alloc(8)]),
      ),
    ).toBe("gif");
    expect(
      detectRasterFormat(
        Buffer.concat([
          Buffer.from("RIFF"),
          Buffer.alloc(4),
          Buffer.from("WEBPVP8 "),
        ]),
      ),
    ).toBe("webp");
    expect(
      detectRasterFormat(
        Buffer.concat([
          Buffer.alloc(4),
          Buffer.from("ftypavif"),
          Buffer.alloc(4),
        ]),
      ),
    ).toBe("avif");
  });

  // Each of these is loaded as SVG by libvips; the earlier prefix denylist
  // missed all four (Z2-08 review).
  it.each([
    ["comment-prefixed SVG", Buffer.from(`<!-- x -->${SVG}`)],
    ["DOCTYPE-prefixed SVG", Buffer.from(`<!DOCTYPE svg>${SVG}`)],
    ["gzipped SVG (svgz)", gzipSync(Buffer.from(SVG))],
    ["SVG after 300 bytes of whitespace", Buffer.from(" ".repeat(300) + SVG)],
    ["plain SVG", Buffer.from(SVG)],
  ])("rejects %s", (_label, buffer) => {
    expect(detectRasterFormat(buffer)).toBeNull();
  });

  it("rejects other formats libvips can decode", () => {
    // TIFF (little endian) and HEIC are not in the allowlist.
    expect(
      detectRasterFormat(
        Buffer.concat([Buffer.from("II*\0"), Buffer.alloc(12)]),
      ),
    ).toBeNull();
    expect(
      detectRasterFormat(
        Buffer.concat([
          Buffer.alloc(4),
          Buffer.from("ftypheic"),
          Buffer.alloc(4),
        ]),
      ),
    ).toBeNull();
    expect(detectRasterFormat(Buffer.alloc(0))).toBeNull();
  });
});

describe("GET /api/proxy-image", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    mockSharp.mockClear();
    mockToBuffer.mockResolvedValue(Buffer.from("webp"));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    fetchMock.mockReset();
  });

  it("proxies an allowed raster image", async () => {
    fetchMock.mockResolvedValue(upstream(PNG, { "content-type": "image/png" }));

    const res = await GET(proxyRequest());

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/webp");
    expect(mockSharp).toHaveBeenCalledWith(expect.any(Buffer), {
      limitInputPixels: 50_000_000,
    });
  });

  it("rejects a declared SVG without reading its body", async () => {
    fetchMock.mockResolvedValue(
      upstream(SVG, { "content-type": "image/svg+xml" }),
    );

    const res = await GET(proxyRequest());

    expect(res.status).toBe(415);
    expect(mockSharp).not.toHaveBeenCalled();
  });

  it("rejects an SVG mislabeled as PNG before sharp sees it", async () => {
    fetchMock.mockResolvedValue(
      upstream(`<!DOCTYPE svg>${SVG}`, { "content-type": "image/png" }),
    );

    const res = await GET(proxyRequest());

    expect(res.status).toBe(415);
    expect(mockSharp).not.toHaveBeenCalled();
  });

  it("rejects image types outside the allowlist", async () => {
    fetchMock.mockResolvedValue(
      upstream(PNG, { "content-type": "image/tiff" }),
    );

    expect((await GET(proxyRequest())).status).toBe(415);
  });

  it("returns 413 when the declared length is over the cap", async () => {
    fetchMock.mockResolvedValue(
      upstream(PNG, {
        "content-type": "image/png",
        "content-length": String(16 * 1024 * 1024),
      }),
    );

    expect((await GET(proxyRequest())).status).toBe(413);
  });

  it("returns 413 when an undeclared body streams past the cap", async () => {
    const chunk = new Uint8Array(1024 * 1024);
    let sent = 0;
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        sent += 1;
        if (sent > 20) controller.close();
        else controller.enqueue(chunk);
      },
    });
    fetchMock.mockResolvedValue(
      upstream(body, { "content-type": "image/png" }),
    );

    expect((await GET(proxyRequest())).status).toBe(413);
    expect(mockSharp).not.toHaveBeenCalled();
  });

  it("returns 504 when the upstream body stalls past the timeout", async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementation(
      async (_url: URL, init: { signal: AbortSignal }) => {
        const body = new ReadableStream<Uint8Array>({
          start(controller) {
            init.signal.addEventListener("abort", () =>
              controller.error(
                new DOMException("The operation was aborted.", "AbortError"),
              ),
            );
          },
        });
        return upstream(body, { "content-type": "image/png" });
      },
    );

    const pending = GET(proxyRequest());
    await vi.advanceTimersByTimeAsync(10_000);

    expect((await pending).status).toBe(504);
  });

  it("refuses hosts outside the allowlist", async () => {
    const res = await GET(
      new NextRequest(
        "http://localhost/api/proxy-image?url=https%3A%2F%2Fevil.example%2Fa.png",
      ),
    );

    expect(res.status).toBe(500);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

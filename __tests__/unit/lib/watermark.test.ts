import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { applyWatermark, isWatermarkable } from "@/lib/watermark";

describe("lib/watermark", () => {
  it("watermarks an image when the text contains markup characters", async () => {
    // An unescaped & or < used to break the SVG overlay, and the failure
    // made the download fall back to the original image.
    const png = await sharp({
      create: {
        width: 64,
        height: 64,
        channels: 3,
        background: { r: 0, g: 0, b: 0 },
      },
    })
      .png()
      .toBuffer();

    const result = await applyWatermark(png, "image/png", "R&D <draft>");

    expect(result).not.toBeNull();
    expect(result!.equals(png)).toBe(false);
  });

  it("only watermarks images and PDFs", () => {
    expect(isWatermarkable("image/jpeg")).toBe(true);
    expect(isWatermarkable("application/pdf")).toBe(true);
    expect(isWatermarkable("video/mp4")).toBe(false);
  });
});

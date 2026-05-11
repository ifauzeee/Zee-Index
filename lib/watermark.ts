import sharp from "sharp";
import { PDFDocument, rgb, degrees, StandardFonts } from "pdf-lib";

export async function applyWatermark(
  buffer: Buffer,
  mimeType: string,
  watermarkText: string,
): Promise<Buffer | null> {
  try {
    if (mimeType.startsWith("image/")) {
      return await applyImageWatermark(buffer, watermarkText);
    } else if (mimeType === "application/pdf") {
      return await applyPdfWatermark(buffer, watermarkText);
    }
  } catch (error) {
    console.error("[Watermark] Error applying watermark:", error);
  }
  return null;
}

async function applyImageWatermark(
  buffer: Buffer,
  watermarkText: string,
): Promise<Buffer> {
  const image = sharp(buffer);
  const metadata = await image.metadata();

  const width = metadata.width || 800;
  const height = metadata.height || 600;

  // Create SVG with repeating watermark text
  const fontSize = Math.max(24, Math.floor(width / 20));
  const text = watermarkText || "Confidential";
  const dateStr = new Date().toLocaleDateString();

  const svgText = `
    <svg width="${width}" height="${height}">
      <style>
        .title { fill: rgba(255, 255, 255, 0.35); font-size: ${fontSize}px; font-weight: bold; font-family: sans-serif; }
        .date { fill: rgba(255, 255, 255, 0.25); font-size: ${Math.floor(fontSize * 0.6)}px; font-family: sans-serif; }
      </style>
      <defs>
        <pattern id="watermark" x="0" y="0" width="${width / 2}" height="${height / 3}" patternUnits="userSpaceOnUse" patternTransform="rotate(-30)">
          <text x="50" y="50" class="title">${text}</text>
          <text x="50" y="${50 + fontSize}" class="date">${dateStr}</text>
        </pattern>
      </defs>
      <rect x="0" y="0" width="100%" height="100%" fill="url(#watermark)" />
    </svg>
  `;

  return image
    .composite([
      {
        input: Buffer.from(svgText),
        blend: "difference",
      },
    ])
    .toBuffer();
}

async function applyPdfWatermark(
  buffer: Buffer,
  watermarkText: string,
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.load(buffer);
  const pages = pdfDoc.getPages();
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const text = watermarkText || "Confidential";
  const dateStr = new Date().toLocaleDateString();

  for (const page of pages) {
    const { width, height } = page.getSize();
    const fontSize = Math.max(24, Math.floor(width / 15));

    // Draw diagonally multiple times
    for (let x = -width; x < width * 2; x += width / 1.5) {
      for (let y = -height; y < height * 2; y += height / 2) {
        page.drawText(text, {
          x,
          y,
          size: fontSize,
          font,
          color: rgb(0.7, 0.7, 0.7),
          opacity: 0.3,
          rotate: degrees(30),
        });

        page.drawText(dateStr, {
          x,
          y: y - fontSize,
          size: fontSize * 0.6,
          font,
          color: rgb(0.7, 0.7, 0.7),
          opacity: 0.3,
          rotate: degrees(30),
        });
      }
    }
  }

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

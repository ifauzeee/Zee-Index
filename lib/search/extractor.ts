import { logger } from "@/lib/logger";

/** Maximum file size (in bytes) that we attempt to extract text from: 10 MB. */
const MAX_EXTRACT_SIZE = 10 * 1024 * 1024;

/** Maximum length of extracted text we store in the DB (trimmed to 100 KiB). */
const MAX_STORED_TEXT = 100 * 1024; // ~100k chars ≈ 50 pages of plain text

/* ------- helpers ------------------------------------------------------- */

function cleanText(raw: string): string {
  return raw
    .replace(/\0/g, "") // strip null bytes
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, " ") // control chars
    .replace(/\r\n?/g, "\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .replace(/[ \t]{3,}/g, "  ")
    .trim();
}

function trimText(text: string): string | null {
  const cleaned = cleanText(text);
  if (!cleaned || cleaned.length < 10) return null; // too short to be useful
  return cleaned.slice(0, MAX_STORED_TEXT);
}

const TEXT_MIME_PREFIXES = [
  "text/",
  "application/json",
  "application/xml",
  "application/javascript",
  "application/typescript",
  "application/x-sh",
  "application/x-yaml",
  "application/x-toml",
];

function isReadableText(mimeType: string): boolean {
  if (mimeType === "application/pdf") return false; // handled separately
  if (
    mimeType ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  )
    return false; // handled via mammoth
  return (
    TEXT_MIME_PREFIXES.some((p) => mimeType.startsWith(p)) ||
    mimeType === "application/rtf" ||
    mimeType.endsWith("+xml") ||
    mimeType.endsWith("+json")
  );
}

/* ------- per-format extractors ----------------------------------------- */

async function extractPdf(buffer: Buffer): Promise<string | null> {
  try {
    const { getDocument } = await import("pdfjs-dist");
    const doc = await getDocument({ data: new Uint8Array(buffer) }).promise;
    const results: string[] = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const tc = await page.getTextContent();
      const pageText = tc.items
        .map((item) => ("str" in item ? (item as { str: string }).str : ""))
        .join(" ");
      results.push(pageText);
    }
    doc.destroy();
    return results.join("\n\n");
  } catch (err) {
    logger.warn({ err }, "[Extractor] PDF text extraction failed");
    return null;
  }
}

async function extractDocx(buffer: Buffer): Promise<string | null> {
  try {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return result.value || null;
  } catch (err) {
    logger.warn({ err }, "[Extractor] DOCX text extraction failed");
    return null;
  }
}

async function extractPlainText(buffer: Buffer): Promise<string | null> {
  try {
    return buffer.toString("utf-8");
  } catch {
    return null;
  }
}

/* ------- public API ---------------------------------------------------- */

/**
 * Attempt to extract human-readable text from the given file buffer based on
 * its MIME type.  Returns `null` when the format is unsupported, the file is
 * too large, or extraction produced nothing meaningful.
 */
export async function extractText(
  buffer: Buffer,
  mimeType: string,
  fileSize: number,
): Promise<string | null> {
  if (fileSize > MAX_EXTRACT_SIZE) {
    logger.debug(
      { size: fileSize, mimeType },
      "[Extractor] Skipping — file exceeds max extraction size",
    );
    return null;
  }

  let raw: string | null = null;

  if (mimeType === "application/pdf") {
    raw = await extractPdf(buffer);
  } else if (
    mimeType ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    raw = await extractDocx(buffer);
  } else if (
    mimeType.startsWith("text/") ||
    mimeType === "application/json" ||
    mimeType.endsWith("+xml") ||
    mimeType.endsWith("+json")
  ) {
    raw = await extractPlainText(buffer);
  }

  return raw ? trimText(raw) : null;
}

/**
 * Returns `true` when the MIME type is one that `extractText` can handle.
 */
export function isExtractable(mimeType: string): boolean {
  return (
    mimeType === "application/pdf" ||
    mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    isReadableText(mimeType)
  );
}

/** Max file size for extraction (used for filtering in indexer). */
export { MAX_EXTRACT_SIZE };

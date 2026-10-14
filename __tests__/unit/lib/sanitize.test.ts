import { describe, expect, it } from "vitest";
import { stripHtmlTags } from "@/lib/sanitize";

describe("stripHtmlTags", () => {
  it("keeps plain names unchanged", () => {
    expect(stripHtmlTags("Report Q3 (final) & notes.pdf")).toBe(
      "Report Q3 (final) & notes.pdf",
    );
  });

  it("removes tags", () => {
    expect(stripHtmlTags("<b>bold</b> name")).toBe("bold name");
  });

  it("leaves no tag behind for nested or unclosed input", () => {
    for (const input of [
      "<scr<script>ipt>alert(1)</script>",
      "<<script>script>x",
      "<img src=x onerror=alert(1)",
      "a < b",
    ]) {
      expect(stripHtmlTags(input)).not.toContain("<");
    }
  });
});

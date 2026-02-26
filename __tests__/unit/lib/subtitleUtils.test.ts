import { describe, it, expect } from "vitest";
import { srtToVtt } from "@/lib/subtitleUtils";

describe("lib/subtitleUtils", () => {
  describe("srtToVtt", () => {
    it("adds WEBVTT header", () => {
      const result = srtToVtt("");
      expect(result).toMatch(/^WEBVTT\n\n/);
    });

    it("converts comma timestamps to dot timestamps", () => {
      const srt = `1
00:00:01,000 --> 00:00:05,500
Hello World`;

      const result = srtToVtt(srt);
      expect(result).toContain("WEBVTT");
      expect(result).toContain("00:00:01.000 --> 00:00:05.500");
      expect(result).toContain("Hello World");
    });

    it("handles multiple subtitle blocks", () => {
      const srt = `1
00:00:01,000 --> 00:00:05,500
First line

2
00:00:06,000 --> 00:00:10,200
Second line`;

      const result = srtToVtt(srt);
      expect(result).toContain("00:00:01.000");
      expect(result).toContain("00:00:06.000");
      expect(result).toContain("First line");
      expect(result).toContain("Second line");
    });

    it("preserves text content", () => {
      const srt = `1
00:01:30,500 --> 00:01:35,800
This is a <i>stylized</i> subtitle`;

      const result = srtToVtt(srt);
      expect(result).toContain("This is a <i>stylized</i> subtitle");
    });

    it("handles multi-line subtitles", () => {
      const srt = `1
00:00:01,000 --> 00:00:03,000
Line one
Line two`;

      const result = srtToVtt(srt);
      expect(result).toContain("Line one\nLine two");
    });

    it("handles edge case timestamps", () => {
      const srt = `1
00:00:00,000 --> 99:59:59,999
Max range`;

      const result = srtToVtt(srt);
      expect(result).toContain("00:00:00.000 --> 99:59:59.999");
    });
  });
});

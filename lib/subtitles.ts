export interface SubtitleTrack {
  kind: "subtitles" | "captions" | "chapters" | "metadata" | "descriptions";
  src: string;
  srcLang: string;
  label: string;
  default: boolean;
}

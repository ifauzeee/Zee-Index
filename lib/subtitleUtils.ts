export function srtToVtt(srtText: string): string {
  let vttText = "WEBVTT\n\n";

  vttText += srtText.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, "$1.$2");

  return vttText;
}

export function srtToVtt(srtText: string): string {
  let vttText = "WEBVTT\n\n";

  vttText += srtText.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, "$1.$2");

  return vttText;
}

export async function fetchAndConvertSrt(url: string): Promise<string> {
  const response = await fetch(url);
  const text = await response.text();

  if (text.trim().startsWith("WEBVTT")) {
    return url;
  }

  const vtt = srtToVtt(text);
  const blob = new Blob([vtt], { type: "text/vtt" });
  return URL.createObjectURL(blob);
}

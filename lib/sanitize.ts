/**
 * Remove HTML tags from user-supplied names and search terms. Tags are
 * stripped first, then any `<` left over (from an unclosed or nested tag
 * such as `<scr<script>ipt>`) is dropped, so no tag can survive. Output is
 * still escaped wherever it is rendered; this only keeps markup out of
 * stored names.
 */
export function stripHtmlTags(value: string): string {
  return value.replace(/<[^>]*>?/g, "").replace(/</g, "");
}

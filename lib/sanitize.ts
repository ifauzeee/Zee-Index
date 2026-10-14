/**
 * Remove HTML tags from user-supplied names and search terms. Everything from
 * a `<` up to the next `>` is dropped, and an unclosed `<` drops the rest, so
 * no `<` survives and no tag can be rebuilt from the pieces (as with
 * `<scr<script>ipt>`). Output is still escaped wherever it is rendered; this
 * only keeps markup out of stored names.
 */
export function stripHtmlTags(value: string): string {
  let result = "";
  let inTag = false;
  for (const char of value) {
    if (char === "<") {
      inTag = true;
    } else if (inTag) {
      if (char === ">") inTag = false;
    } else {
      result += char;
    }
  }
  return result;
}

/**
 * Escape a value interpolated into a Google Drive query string.
 *
 * The Drive API uses single quotes as string delimiters and backslash as the
 * escape character. Doubling single quotes (`''`) escapes the delimiter but
 * leaves a literal backslash in the value to be interpreted as an escape by
 * the query parser, so backslashes are escaped first and quotes second.
 */
export function escapeDriveQueryValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

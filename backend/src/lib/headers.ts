/**
 * Parses headers configured as text: one `Name=Value` pair per line. For backwards compatibility pairs can also be
 * separated by `,` or `;`, but only if the next pair starts with `Name=`, so that values may contain `,`, `;` and `=`
 * (e.g. base64 padding in `Authorization=Basic dXNlcjpwYXNz==`).
 */
export function parseHeaders(text: string | undefined | null): Record<string, string> {
  const headers: Record<string, string> = {};
  if (!text) {
    return headers;
  }

  for (const pair of text.split(/\r?\n|[,;](?=\s*[\w-]+\s*=)/)) {
    const index = pair.indexOf('=');
    if (index <= 0) {
      continue;
    }

    const key = pair.substring(0, index).trim();
    const value = pair.substring(index + 1).trim();
    if (key && value) {
      headers[key] = value;
    }
  }

  return headers;
}

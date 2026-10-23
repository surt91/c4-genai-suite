/**
 * Builds an `attachment` Content-Disposition header (RFC 6266) that is valid for any file name: an ASCII fallback in
 * `filename` and the exact name percent-encoded in `filename*`. Raw non-Latin-1 characters would make Node reject the
 * header (ERR_INVALID_CHAR) and quotes would break it.
 */
export function attachmentContentDisposition(fileName: string): string {
  const fallback = fileName.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_');
  const encoded = encodeURIComponent(fileName).replace(/['()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}

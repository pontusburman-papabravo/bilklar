export function redactRequestPath(url: string | undefined): string {
  if (!url) return "";
  return url
    .replace(/\/invite\/[^/?#]+/gi, "/invite/[redacted]")
    .replace(/([?&]token=)[^&]*/gi, "$1[redacted]");
}

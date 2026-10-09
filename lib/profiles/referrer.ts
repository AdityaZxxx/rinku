/**
 * Traffic sources are stored as registrable domains so l.instagram.com and
 * instagram.com count as one source; paths and query strings are dropped
 * before anything is persisted.
 */

const SECOND_LEVEL = new Set(["co", "com", "org", "net", "gov", "ac", "edu"]);

function registrable(host: string): string {
  const labels = host.split(".");
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host) || labels.length <= 2) {
    return host;
  }
  return SECOND_LEVEL.has(labels[labels.length - 2] ?? "")
    ? labels.slice(-3).join(".")
    : labels.slice(-2).join(".");
}

export function referrerDomain(value: string | undefined | null): string | null {
  if (!value) {
    return null;
  }
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return null;
  }
  return registrable(url.hostname.toLowerCase());
}

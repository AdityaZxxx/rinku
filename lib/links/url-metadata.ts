import { log } from "@/lib/log";
import "server-only";

const FETCH_TIMEOUT_MS = 5000;
const MAX_BYTES = 1_000_000;

const META_TAG_PATTERN = /<meta\s[^>]*>/gi;
const PROPERTY_PATTERN = /(?:property|name)\s*=\s*(?:"([^"]*)"|'([^']*)')/i;
const CONTENT_PATTERN = /content\s*=\s*(?:"([^"]*)"|'([^']*)')/i;
const TITLE_PATTERN = /<title[^>]*>([^<]*)<\/title>/i;
const IP_PATTERN = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

export type UrlMetadata = {
  title: string;
  imageUrl: string | null;
};

/**
 * The fetch runs on the server with a user-supplied URL, so private ranges are
 * blocked here rather than trusting the target to be public. A redirect can
 * still land on a private host (accepted for now).
 */
function isPublicHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (!host) {
    return false;
  }
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal")
  ) {
    return false;
  }
  if (host === "::1" || host === "[::1]" || host === "0.0.0.0") {
    return false;
  }

  const ip = IP_PATTERN.exec(host);
  if (ip) {
    const a = Number(ip[1]);
    const b = Number(ip[2]);
    if (a === 0 || a === 10 || a === 127 || a >= 224) {
      return false;
    }
    if (a === 169 && b === 254) {
      return false;
    }
    if (a === 172 && b >= 16 && b <= 31) {
      return false;
    }
    if (a === 192 && b === 168) {
      return false;
    }
  }
  return true;
}

function firstGroup(match: RegExpExecArray | null): string | null {
  return match ? (match[1] ?? match[2] ?? null) : null;
}

// Entity literals (& and friends) in source get mangled on the way in, so
// the ampersand is built from an escape and the pairs from template strings.
const AMP = "\u0026";

function decodeEntities(value: string): string {
  return value
    .replaceAll(`${AMP}amp;`, AMP)
    .replaceAll(`${AMP}lt;`, "<")
    .replaceAll(`${AMP}gt;`, ">")
    .replaceAll(`${AMP}quot;`, '"')
    .replaceAll(`${AMP}#39;`, "'");
}

function absoluteUrl(value: string, base: string): string | null {
  try {
    const url = new URL(value, base);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

function parseMetadata(html: string, base: string): UrlMetadata | null {
  const tags: Array<{ key: string; content: string }> = [];
  for (const match of html.matchAll(META_TAG_PATTERN)) {
    const key = firstGroup(PROPERTY_PATTERN.exec(match[0]));
    const content = firstGroup(CONTENT_PATTERN.exec(match[0]));
    if (key && content) {
      tags.push({ key: key.toLowerCase(), content });
    }
  }

  const byKey = (keys: string[]): string | null => {
    for (const key of keys) {
      const found = tags.find((tag) => tag.key === key);
      if (found) {
        return found.content;
      }
    }
    return null;
  };

  const rawTitle =
    byKey(["og:title", "twitter:title"]) ?? TITLE_PATTERN.exec(html)?.[1]?.trim() ?? null;
  const rawImage = byKey([
    "og:image",
    "og:image:url",
    "og:image:secure_url",
    "twitter:image",
    "twitter:image:src",
  ]);

  if (!rawTitle && !rawImage) {
    return null;
  }

  const imageUrl = rawImage ? absoluteUrl(rawImage, base) : null;
  if (rawImage && !imageUrl) {
    return rawTitle ? { title: decodeEntities(rawTitle), imageUrl: null } : null;
  }

  return {
    title: rawTitle ? decodeEntities(rawTitle) : "",
    imageUrl,
  };
}

async function readCapped(response: Response, maxBytes: number): Promise<string | null> {
  if (!response.body) {
    return null;
  }

  const decoder = new TextDecoder();
  let html = "";
  let size = 0;
  for await (const chunk of response.body) {
    size += chunk.byteLength;
    html += decoder.decode(chunk, { stream: true });
    if (size > maxBytes) {
      break;
    }
  }
  return html;
}

export async function fetchPageMetadata(url: string): Promise<UrlMetadata | null> {
  let target: URL;
  try {
    target = new URL(url);
  } catch {
    return null;
  }
  if (!isPublicHost(target.hostname)) {
    return null;
  }

  let response: Response;
  try {
    response = await fetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { "user-agent": "Mozilla/5.0 (compatible; RinkuBot/1.0)" },
    });
  } catch (error) {
    log.warn(
      "url-metadata",
      `metadata fetch failed for ${url}`,
      error instanceof Error ? error.message : String(error),
    );
    return null;
  }
  if (!response.ok) {
    return null;
  }

  const html = await readCapped(response, MAX_BYTES);
  if (!html) {
    return null;
  }
  return parseMetadata(html, url);
}

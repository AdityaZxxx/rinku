import { type NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

import { log } from "@/lib/log";
import { createClient } from "@/lib/supabase/server";

// A thumbnail only ever needs to be decoded once; keep the fetch bounded so an
// owner-supplied URL cannot be used to exhaust memory or hang the route.
const MAX_SOURCE_BYTES = 5 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 8000;
// Downscale, then a light blur: still clearly unavailable, but the shape
// survives enough to entice visitors instead of reading as a gray box.
const DERIVATIVE_WIDTH = 96;
const DERIVATIVE_BLUR = 3;

/**
 * The image bytes are owner-controlled, so fetching them server-side is an
 * SSRF surface: reject anything that is not a public HTTPS host, and refuse
 * redirects so a public host cannot bounce to an internal one.
 */
function isPubliclyRoutable(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host.includes(":")
  ) {
    // Literal IPv6 hosts are refused outright; link thumbnails never need them.
    return false;
  }
  const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (ipv4) {
    const first = Number(ipv4[1]);
    const second = Number(ipv4[2]);
    if (first === 0 || first === 10 || first === 127) return false;
    if (first === 169 && second === 254) return false;
    if (first === 172 && second >= 16 && second <= 31) return false;
    if (first === 192 && second === 168) return false;
    if (first >= 224) return false;
  }
  return true;
}

function notFound(): NextResponse {
  return new NextResponse("Not found.", { status: 404 });
}

/**
 * Blurred, downscaled preview of a gated link's thumbnail. Always blurred —
 * never a redirect to the source — so the URL can be embedded anywhere without
 * leaking the original bytes.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("links")
    .select("image_url, min_age")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    log.error("gated-thumb", "link lookup failed", error.message);
    return new NextResponse("Something went wrong.", { status: 500 });
  }
  if (!data || data.min_age === null || !data.image_url) {
    return notFound();
  }

  let source: URL;
  try {
    source = new URL(data.image_url);
  } catch {
    return notFound();
  }
  if (source.protocol !== "https:" || !isPubliclyRoutable(source.hostname)) {
    return notFound();
  }

  try {
    const upstream = await fetch(source, {
      redirect: "error",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { accept: "image/*" },
    });
    if (!upstream.ok) {
      return notFound();
    }
    const contentType = upstream.headers.get("content-type") ?? "";
    if (!contentType.startsWith("image/")) {
      return new NextResponse("Unsupported media.", { status: 415 });
    }
    const sourceBytes = Buffer.from(await upstream.arrayBuffer());
    if (sourceBytes.byteLength > MAX_SOURCE_BYTES) {
      return new NextResponse("Image too large.", { status: 413 });
    }

    const derivative = await sharp(sourceBytes)
      .resize({ width: DERIVATIVE_WIDTH })
      .blur(DERIVATIVE_BLUR)
      .webp({ quality: 60 })
      .toBuffer();

    return new NextResponse(new Uint8Array(derivative), {
      headers: {
        "content-type": "image/webp",
        // The derivative depends only on the source, so it caches well.
        "cache-control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    });
  } catch (caught) {
    log.warn(
      "gated-thumb",
      "derivative failed",
      caught instanceof Error ? caught.message : String(caught),
    );
    return notFound();
  }
}

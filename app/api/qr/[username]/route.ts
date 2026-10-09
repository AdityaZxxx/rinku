import { type NextRequest, NextResponse } from "next/server";
import { toBuffer as qrPng, toString as qrSvg } from "qrcode";
import sharp from "sharp";

import { profileUrl, RINKU_MARK_PATH } from "@/lib/brand";
import { getPublicProfileByUsername } from "@/lib/db/profile";

const CACHE = "public, max-age=31536000, immutable";
// The mark covers about a quarter of the code, so codes with it render at
// the highest error correction; the pad keeps a guaranteed gap of background
// between the mark and the dots.
const LOGO_SHARE = 0.25;
const MARK_INSET = 0.12;
const PAD_RADIUS = 0.18;

function hexColor(value: string | null, fallback: string): string {
  const match = value?.match(/^#?([0-9a-fA-F]{6})$/);
  const hex = match?.[1]?.toLowerCase();
  return hex ? `#${hex}` : fallback;
}

function overlayMarkup(size: number, dots: string, background: string): string {
  const inset = size * MARK_INSET;
  const scale = (size - 2 * inset) / 256;
  return (
    `<rect width="${size}" height="${size}" rx="${size * PAD_RADIUS}" fill="${background}"/>` +
    `<path fill="${dots}" transform="translate(${inset} ${inset}) scale(${scale})" d="${RINKU_MARK_PATH}"/>`
  );
}

/** The mark lands in viewBox units, so plain string surgery is enough. */
function embedLogo(svg: string, dots: string, background: string): string {
  const viewBox = /viewBox="0 0 (\d+) (\d+)"/.exec(svg);
  const modules = Number(viewBox?.[1]);
  if (!viewBox || !Number.isFinite(modules) || modules <= 0) {
    return svg;
  }
  const size = modules * LOGO_SHARE;
  const offset = (modules - size) / 2;
  return svg.replace(
    "</svg>",
    `<g transform="translate(${offset} ${offset})">${overlayMarkup(size, dots, background)}</g></svg>`,
  );
}

async function rasterizeWithLogo(
  qr: Buffer,
  dots: string,
  background: string,
): Promise<Buffer> {
  const size = Math.round(1024 * LOGO_SHARE);
  const overlay = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">${overlayMarkup(size, dots, background)}</svg>`,
  );
  const mark = await sharp(overlay).png().toBuffer();
  return sharp(qr)
    .composite([{ input: mark }])
    .png()
    .toBuffer();
}

function responseHeaders(contentType: string, disposition?: string): Headers {
  const headers = new Headers({ "content-type": contentType, "cache-control": CACHE });
  if (disposition) {
    headers.set("content-disposition", disposition);
  }
  return headers;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> },
) {
  const { username } = await params;
  // Only existing pages get a code, so this route can never become a
  // QR generator for arbitrary URLs.
  const profile = await getPublicProfileByUsername(username);
  if (!profile) {
    return new NextResponse("Page not found.", { status: 404 });
  }

  const search = new URL(request.url).searchParams;
  const format = search.get("format") ?? "svg";
  if (format !== "svg" && format !== "png") {
    return new NextResponse("Unsupported format.", { status: 400 });
  }
  const logo = search.get("logo") !== "0";
  const dots = hexColor(search.get("color"), "#000000");
  const background = hexColor(search.get("background"), "#ffffff");
  const disposition = search.get("download")
    ? `attachment; filename="rinku-qr-${profile.username}.${format}"`
    : undefined;

  const url = profileUrl(profile.username);
  const options = {
    margin: 1,
    errorCorrectionLevel: logo ? ("H" as const) : ("M" as const),
    color: { dark: `${dots}ff`, light: `${background}ff` },
  };

  if (format === "png") {
    const qr = await qrPng(url, { ...options, type: "png", width: 1024 });
    const bytes = logo ? await rasterizeWithLogo(qr, dots, background) : qr;
    return new NextResponse(new Uint8Array(bytes), {
      headers: responseHeaders("image/png", disposition),
    });
  }

  const svg = await qrSvg(url, { ...options, type: "svg" });
  return new NextResponse(logo ? embedLogo(svg, dots, background) : svg, {
    headers: responseHeaders("image/svg+xml", disposition),
  });
}

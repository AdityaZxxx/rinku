import type { ComponentType } from "react";
import * as Ph from "@phosphor-icons/react/ssr";

import {
  iconMediaId,
  isIconMedia,
  platformIconMedia,
  platformIconMediaForUrl,
} from "@/lib/links/media";
import { faviconUrl } from "@/lib/links/model";

function PhosphorGlyph({ id, className }: { id: string; className: string }) {
  // SAFETY: the key is built from icon-media ids Phosphor's barrel defines,
  // so the module record is indexed by its own key space; misses render
  // nothing.
  const key = `${id}Icon` as keyof typeof Ph;
  // eslint-disable-next-line import/namespace -- dynamic barrel key, guarded below
  const Icon = Ph[key];
  if (!Icon) {
    return null;
  }
  // SAFETY: every export of the SSR barrel is an icon component.
  const Renderable = Icon as ComponentType<{ className?: string }>;
  return <Renderable className={className} />;
}

function GlyphImg({ src, className }: { src: string; className: string }) {
  // eslint-disable-next-line @next/next/no-img-element -- tiny cross-host icon: the optimizer cache never earns its keep at this size
  return <img src={src} alt="" className={className} />;
}

/**
 * Left-edge glyph for a link row: the media the owner chose, the target's
 * brand icon when it is a known platform, its favicon otherwise.
 */
export function LinkGlyph({
  url,
  imageUrl,
}: {
  url: string | null;
  imageUrl: string | null;
}) {
  if (isIconMedia(imageUrl)) {
    return <PhosphorGlyph id={iconMediaId(imageUrl)} className="size-4 shrink-0" />;
  }
  if (imageUrl && imageUrl !== "") {
    return (
      <GlyphImg src={imageUrl} className="size-4 shrink-0 rounded-full object-cover" />
    );
  }
  if (url) {
    const brand = platformIconMediaForUrl(url);
    if (brand) {
      return <PhosphorGlyph id={iconMediaId(brand)} className="size-4 shrink-0" />;
    }
    const favicon = faviconUrl(url);
    if (favicon) {
      return <GlyphImg src={favicon} className="size-4 shrink-0 rounded-full" />;
    }
  }
  return null;
}

/**
 * Left-edge glyph for a source row: the platform's brand icon, the domain's
 * favicon, or the muted mark for Direct traffic.
 */
export function SourceGlyph({ domain }: { domain: string | null }) {
  if (domain === null) {
    return <PhosphorGlyph id="LinkSimple" className="size-4 shrink-0" />;
  }
  const brand = platformIconMedia(domain);
  if (brand) {
    return <PhosphorGlyph id={iconMediaId(brand)} className="size-4 shrink-0" />;
  }
  const favicon = faviconUrl(`https://${domain}/`);
  if (favicon) {
    return <GlyphImg src={favicon} className="size-4 shrink-0 rounded-full" />;
  }
  return null;
}

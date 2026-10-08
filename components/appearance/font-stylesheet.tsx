import {
  allFontsStylesheetUrl,
  fontStylesheetUrl,
  type FontId,
} from "@/lib/profiles/appearance";

/**
 * Loads only the appearance font(s) a page actually renders. next/font can't
 * be called per-value, so these go through Google's CSS API via a hoisted,
 * deduplicated <link> (React 19 moves `precedence`-marked stylesheets to head).
 */
export function FontStylesheet({ font }: { font: FontId }) {
  const href = fontStylesheetUrl(font);
  if (!href) {
    return null;
  }
  return <link rel="stylesheet" href={href} precedence="fonts" />;
}

export function AllFontsStylesheet() {
  return <link rel="stylesheet" href={allFontsStylesheetUrl()} precedence="fonts" />;
}

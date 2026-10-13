export const fontIds = [
  "inter",
  "noto-sans",
  "plus-jakarta-sans",
  "work-sans",
  "dm-sans",
  "karla",
  "nunito",
  "figtree",
  "merriweather",
  "playfair-display",
  "lora",
  "cormorant-garamond",
  "source-serif-4",
  "ibm-plex-mono",
  "space-grotesk",
  "fraunces",
] as const;

export type FontId = (typeof fontIds)[number];

export const fonts: Array<{ id: FontId; label: string; sample: string; family: string }> =
  [
    { id: "inter", label: "Inter", sample: "Modern sans", family: "Inter" },
    { id: "noto-sans", label: "Noto Sans", sample: "Neutral sans", family: "Noto Sans" },
    {
      id: "plus-jakarta-sans",
      label: "Plus Jakarta Sans",
      sample: "Friendly sans",
      family: "Plus Jakarta Sans",
    },
    { id: "work-sans", label: "Work Sans", sample: "UI sans", family: "Work Sans" },
    { id: "dm-sans", label: "DM Sans", sample: "Compact sans", family: "DM Sans" },
    { id: "karla", label: "Karla", sample: "Warm sans", family: "Karla" },
    { id: "nunito", label: "Nunito", sample: "Rounded sans", family: "Nunito" },
    { id: "figtree", label: "Figtree", sample: "Geometric sans", family: "Figtree" },
    {
      id: "merriweather",
      label: "Merriweather",
      sample: "Readable serif",
      family: "Merriweather",
    },
    {
      id: "playfair-display",
      label: "Playfair Display",
      sample: "Editorial serif",
      family: "Playfair Display",
    },
    { id: "lora", label: "Lora", sample: "Classic serif", family: "Lora" },
    {
      id: "cormorant-garamond",
      label: "Cormorant Garamond",
      sample: "High-contrast serif",
      family: "Cormorant Garamond",
    },
    {
      id: "source-serif-4",
      label: "Source Serif 4",
      sample: "Bookish serif",
      family: "Source Serif 4",
    },
    {
      id: "ibm-plex-mono",
      label: "IBM Plex Mono",
      sample: "Technical mono",
      family: "IBM Plex Mono",
    },
    {
      id: "space-grotesk",
      label: "Space Grotesk",
      sample: "Techy sans",
      family: "Space Grotesk",
    },
    { id: "fraunces", label: "Fraunces", sample: "Display serif", family: "Fraunces" },
  ];

export function toFontId(value: string | null | undefined): FontId {
  if (!value) {
    return "inter";
  }
  // SAFETY: fontIds and FontId derive from the same const tuple, so a
  // includes() hit means the value is a FontId member; z.enum-validated DB
  // writes keep this invariant at runtime.
  for (const id of fontIds) {
    if (value === id) {
      return id;
    }
  }
  return "inter";
}

export function fontStack(font: FontId): string {
  switch (font) {
    case "noto-sans":
      return '"Noto Sans", system-ui, sans-serif';
    case "plus-jakarta-sans":
      return '"Plus Jakarta Sans", system-ui, sans-serif';
    case "work-sans":
      return '"Work Sans", system-ui, sans-serif';
    case "dm-sans":
      return '"DM Sans", system-ui, sans-serif';
    case "karla":
      return '"Karla", system-ui, sans-serif';
    case "nunito":
      return '"Nunito", ui-rounded, system-ui, sans-serif';
    case "figtree":
      return '"Figtree", system-ui, sans-serif';
    case "merriweather":
      return '"Merriweather", Georgia, serif';
    case "playfair-display":
      return '"Playfair Display", Georgia, serif';
    case "lora":
      return '"Lora", Georgia, serif';
    case "cormorant-garamond":
      return '"Cormorant Garamond", Georgia, serif';
    case "source-serif-4":
      return '"Source Serif 4", Georgia, serif';
    case "ibm-plex-mono":
      return '"IBM Plex Mono", ui-monospace, monospace';
    case "space-grotesk":
      return '"Space Grotesk", system-ui, sans-serif';
    case "fraunces":
      return '"Fraunces", Georgia, serif';
    default:
      return "var(--font-inter), system-ui, sans-serif";
  }
}

/** Families injected by the Google Fonts stylesheet for a given FontId. */
const googleFamily: Record<Exclude<FontId, "inter">, string> = {
  "noto-sans": "Noto+Sans:wght@400;500;600;700",
  "plus-jakarta-sans": "Plus+Jakarta+Sans:wght@400;500;600;700",
  "work-sans": "Work+Sans:wght@400;500;600;700",
  "dm-sans": "DM+Sans:wght@400;500;600;700",
  karla: "Karla:wght@400;500;600;700",
  nunito: "Nunito:wght@400;600;700;800",
  figtree: "Figtree:wght@400;500;600;700",
  merriweather: "Merriweather:wght@400;700",
  "playfair-display": "Playfair+Display:wght@400;600;700",
  lora: "Lora:wght@400;500;600;700",
  "cormorant-garamond": "Cormorant+Garamond:wght@400;500;600;700",
  "source-serif-4": "Source+Serif+4:wght@400;600;700",
  "ibm-plex-mono": "IBM+Plex+Mono:wght@400;500;600;700",
  "space-grotesk": "Space+Grotesk:wght@400;500;600;700",
  fraunces: "Fraunces:opsz,wght@9..144,400..700",
};

/**
 * Stylesheet URL for one appearance font, or null for fonts the app already
 * loads (Inter via next/font). Loading one `<link>` per visible font, instead
 * of 16 next/font variables on every page, keeps the public page from paying
 * for fonts nobody sees.
 */
export function fontStylesheetUrl(font: FontId): string | null {
  if (font === "inter") {
    return null;
  }
  return `https://fonts.googleapis.com/css2?family=${googleFamily[font]}&display=swap`;
}

/** One combined stylesheet for every appearance font (editor previews). */
export function allFontsStylesheetUrl(): string {
  const families = Object.values(googleFamily)
    .map((family) => `family=${family}`)
    .join("&");
  return `https://fonts.googleapis.com/css2?${families}&display=swap`;
}

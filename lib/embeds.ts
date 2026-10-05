import * as z from "zod";

/**
 * Typed metadata for a miscellaneous iframe-embed block (maps, calendar,
 * forms). Mirrors the music/video blocks: a provider tag plus the fields the
 * embed URL needs, and the same embed/classic/featured style option.
 */

export type EmbedProvider = "google-maps" | "google-calendar" | "typeform";

export const embedStyleSchema = z.enum(["embed", "classic", "featured"]);
export type EmbedStyle = z.infer<typeof embedStyleSchema>;

export interface GoogleMapsMetadata {
  provider: "google-maps";
  // Free-text query the visitor's pin renders from: "Eiffel Tower, Paris".
  query: string;
  style?: EmbedStyle;
}

export interface GoogleCalendarMetadata {
  provider: "google-calendar";
  // The calendar's src id from its "Integrate calendar" URL.
  calendarId: string;
  style?: EmbedStyle;
}

export interface TypeformMetadata {
  provider: "typeform";
  formId: string;
  style?: EmbedStyle;
}

export type EmbedMetadata =
  | GoogleMapsMetadata
  | GoogleCalendarMetadata
  | TypeformMetadata;

export const embedMetadataSchema = z.discriminatedUnion("provider", [
  z.object({
    provider: z.literal("google-maps"),
    query: z.string(),
    style: embedStyleSchema.optional(),
  }),
  z.object({
    provider: z.literal("google-calendar"),
    calendarId: z.string(),
    style: embedStyleSchema.optional(),
  }),
  z.object({
    provider: z.literal("typeform"),
    formId: z.string(),
    style: embedStyleSchema.optional(),
  }),
]);

function googleHost(host: string): boolean {
  return /^(?:[a-z0-9-]+\.)*google\.[a-z.]+$/.test(host) || host === "maps.google.com";
}

/** Parse a user-pasted URL into embed metadata, or null when unrecognized. */
export function parseEmbedUrl(url: string): EmbedMetadata | null {
  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return null;
  }

  const host = parsed.hostname
    .replace(/^www\./, "")
    .replace(/^m\./, "")
    .toLowerCase();

  if (
    googleHost(host) &&
    (parsed.pathname.startsWith("/maps") || host.startsWith("maps."))
  ) {
    const query = parsed.searchParams.get("q");
    if (query) {
      return { provider: "google-maps", query };
    }
    const placeMatch = /\/maps\/place\/([^/@]+)/.exec(parsed.pathname);
    if (placeMatch?.[1]) {
      return {
        provider: "google-maps",
        query: decodeURIComponent(placeMatch[1].replace(/\+/g, " ")),
      };
    }
    return null;
  }

  if (host === "calendar.google.com" && parsed.pathname.startsWith("/calendar/embed")) {
    const src = parsed.searchParams.get("src");
    if (src) {
      return { provider: "google-calendar", calendarId: src };
    }
    return null;
  }

  if (host === "form.typeform.com") {
    const segments = parsed.pathname.split("/").filter(Boolean);
    if (segments[0] === "to" && segments[1]) {
      return { provider: "typeform", formId: segments[1] };
    }
    return null;
  }

  return null;
}

export interface EmbedSpec {
  src: string;
  height: number;
}

/** The iframe src + height for a block embed. */
export function embedSpec(metadata: EmbedMetadata): EmbedSpec {
  switch (metadata.provider) {
    case "google-maps":
      return {
        src: `https://www.google.com/maps?q=${encodeURIComponent(metadata.query)}&output=embed`,
        height: 400,
      };
    case "google-calendar":
      return {
        src: `https://calendar.google.com/calendar/embed?src=${encodeURIComponent(metadata.calendarId)}`,
        height: 600,
      };
    case "typeform":
      return { src: `https://form.typeform.com/to/${metadata.formId}`, height: 500 };
  }
}

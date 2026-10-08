import * as z from "zod";

/**
 * Typed metadata for "music" links. Stored in links.metadata (jsonb) once at
 * write time, so the public page renders the embed without re-parsing URLs.
 */

export type SpotifyType = "track" | "album" | "playlist" | "artist" | "episode" | "show";

/** How a music link renders on the profile: the player itself, a classic row, or a featured card. */
export type MusicEmbedStyle = "embed" | "classic" | "featured";

export const musicEmbedStyleSchema = z.enum(["embed", "classic", "featured"]);

export interface SpotifyMetadata {
  provider: "spotify";
  type: SpotifyType;
  id: string;
  style?: MusicEmbedStyle;
}

export interface AppleMusicMetadata {
  provider: "apple-music";
  // Path after the host, including locale and query: "us/album/name/123?i=4".
  path: string;
  style?: MusicEmbedStyle;
}

export interface SoundCloudMetadata {
  provider: "soundcloud";
  // Canonical track or artist URL on soundcloud.com.
  url: string;
  style?: MusicEmbedStyle;
}

export type LinkMetadata = SpotifyMetadata | AppleMusicMetadata | SoundCloudMetadata;

const styleField = { style: musicEmbedStyleSchema.optional() } as const;

export const linkMetadataSchema = z.discriminatedUnion("provider", [
  z.object({
    provider: z.literal("spotify"),
    type: z.enum(["track", "album", "playlist", "artist", "episode", "show"]),
    id: z.string(),
    ...styleField,
  }),
  z.object({ provider: z.literal("apple-music"), path: z.string(), ...styleField }),
  z.object({ provider: z.literal("soundcloud"), url: z.string(), ...styleField }),
]);

const SPOTIFY_TYPES: ReadonlySet<string> = new Set([
  "track",
  "album",
  "playlist",
  "artist",
  "episode",
  "show",
]);

function asSpotifyType(value: string | undefined): SpotifyType | null {
  // SAFETY: SPOTIFY_TYPES only contains values of the SpotifyType union.
  return value !== undefined && SPOTIFY_TYPES.has(value) ? (value as SpotifyType) : null;
}

/** Parse a user-pasted URL into music metadata, or null when it is not music. */
export function parseMusicUrl(url: string): LinkMetadata | null {
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

  if (host === "open.spotify.com" || host === "play.spotify.com") {
    // /intl-<locale>/ prefixed paths are common when copying from the web app.
    const segments = parsed.pathname.split("/").filter(Boolean);
    const offset = segments[0]?.startsWith("intl-") ? 1 : 0;
    const type = asSpotifyType(segments[offset]);
    const id = segments[offset + 1];
    if (type && id && /^[A-Za-z0-9]+$/.test(id)) {
      return { provider: "spotify", type, id };
    }
    return null;
  }

  if (parsed.protocol === "spotify:") {
    // spotify:track:<id> URIs from share menus.
    const parts = parsed.href.split(":");
    const type = asSpotifyType(parts[1]);
    if (parts.length === 3 && type && parts[2]) {
      return { provider: "spotify", type, id: parts[2] };
    }
    return null;
  }

  if (host === "music.apple.com") {
    // /<locale>/<kind>/<slug>/<id> or /<locale>/album/...?i=<songId>
    const segments = parsed.pathname.split("/").filter(Boolean);
    const locale = segments[0];
    if (
      segments.length >= 3 &&
      locale !== undefined &&
      /^[a-z]{2}(-[a-z]{2})?$/i.test(locale)
    ) {
      const path = segments.join("/");
      if (/^[a-z-]+\/(album|song|playlist|artist|music-video)\//i.test(path)) {
        // Keep the query: ?i=<trackId> tells Apple Music to start at a song.
        return { provider: "apple-music", path: path + parsed.search };
      }
    }
    return null;
  }

  if (host === "soundcloud.com") {
    const segments = parsed.pathname.split("/").filter(Boolean);
    if (segments.length >= 2) {
      return {
        provider: "soundcloud",
        url: `https://soundcloud.com/${segments[0]}/${segments[1]}`,
      };
    }
    if (segments.length === 1) {
      return { provider: "soundcloud", url: `https://soundcloud.com/${segments[0]}` };
    }
  }

  return null;
}

export interface MusicEmbedSource {
  src: string;
  height: number;
}

/** The iframe src + height for a music link, ready to render. */
export function musicEmbed(metadata: LinkMetadata): MusicEmbedSource {
  switch (metadata.provider) {
    case "spotify": {
      const compact = metadata.type === "track" || metadata.type === "episode";
      return {
        src: `https://open.spotify.com/embed/${metadata.type}/${metadata.id}`,
        height: compact ? 152 : 352,
      };
    }
    case "apple-music":
      return { src: `https://embed.music.apple.com/${metadata.path}`, height: 450 };
    case "soundcloud":
      return {
        src: `https://w.soundcloud.com/player/?url=${encodeURIComponent(metadata.url)}&color=%23ff5500&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false`,
        height: 166,
      };
  }
}

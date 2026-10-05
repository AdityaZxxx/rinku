import { normalizeUrl } from "@/lib/links";
import { parseMusicUrl } from "@/lib/music";
import { PLATFORMS } from "@/lib/platforms";
import { parseVideoUrl } from "@/lib/video";

export interface CatalogItem {
  id: string;
  label: string;
  tagline: string;
  category: "socials" | "contact" | "music" | "video";
  placeholder: string;
  buildUrl: (input: string) => string | null;
  // Custom rows carry no platform; socials do.
  platform: string | null;
  // Error text when buildUrl rejects the input; the default assumes a handle.
  hint?: string;
}

const CONTACTS: CatalogItem[] = [
  {
    id: "email",
    label: "Email",
    category: "contact",
    tagline: "Reach you by email",
    placeholder: "you@example.com",
    platform: null,
    buildUrl: (input) => {
      const trimmed = input.trim();
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed) ? `mailto:${trimmed}` : null;
    },
  },
  {
    id: "phone",
    label: "Phone",
    category: "contact",
    tagline: "Let people call or text you",
    placeholder: "+1 555 010 2233",
    platform: null,
    buildUrl: (input) => {
      const digits = input.replace(/[^\d+]/g, "");
      return digits.replace(/\D/g, "").length >= 7 ? `tel:${digits}` : null;
    },
  },
];

function musicRow(
  provider: "spotify" | "apple-music" | "soundcloud",
  label: string,
  placeholder: string,
  tagline: string,
): CatalogItem {
  return {
    id: provider,
    label,
    category: "music",
    tagline,
    placeholder,
    platform: null,
    hint: `Paste a full ${label} link (track, album, or playlist).`,
    buildUrl: (input) => {
      const normalized = normalizeUrl(input);
      const metadata = parseMusicUrl(normalized);
      return metadata?.provider === provider ? normalized : null;
    },
  };
}

const MUSIC: CatalogItem[] = [
  musicRow("spotify", "Spotify", "open.spotify.com/track/...", "Embed a Spotify player"),
  musicRow(
    "apple-music",
    "Apple Music",
    "music.apple.com/us/album/...",
    "Embed an Apple Music player",
  ),
  musicRow(
    "soundcloud",
    "SoundCloud",
    "soundcloud.com/artist/track",
    "Embed a SoundCloud player",
  ),
];

function videoRow(
  provider: "youtube" | "vimeo",
  label: string,
  placeholder: string,
  tagline: string,
): CatalogItem {
  return {
    id: provider,
    label,
    category: "video",
    tagline,
    placeholder,
    platform: null,
    hint: `Paste a full ${label} video link.`,
    buildUrl: (input) => {
      const normalized = normalizeUrl(input);
      const metadata = parseVideoUrl(normalized);
      return metadata?.provider === provider ? normalized : null;
    },
  };
}

const VIDEO: CatalogItem[] = [
  videoRow("youtube", "YouTube", "youtube.com/watch?v=...", "Embed a YouTube player"),
  videoRow("vimeo", "Vimeo", "vimeo.com/123456789", "Embed a Vimeo player"),
];

export const CATALOG: CatalogItem[] = [
  ...PLATFORMS.map((platform) => ({
    id: platform.id,
    label: platform.label,
    tagline: platform.tagline,
    category: "socials" as const,
    placeholder: platform.placeholder,
    buildUrl: platform.profileUrl,
    platform: platform.id,
  })),
  ...CONTACTS,
  ...MUSIC,
  ...VIDEO,
];

export const CATEGORIES = [
  { id: "socials", label: "Socials" },
  { id: "contact", label: "Contact" },
  { id: "music", label: "Music" },
  { id: "video", label: "Video" },
] as const;

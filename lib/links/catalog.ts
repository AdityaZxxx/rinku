import { parseEmbedUrl } from "@/lib/links/embeds";
import { normalizeUrl } from "@/lib/links/model";
import { parseMusicUrl } from "@/lib/links/music";
import { PLATFORMS } from "@/lib/links/platforms";
import { parseVideoUrl } from "@/lib/links/video";

export interface CatalogItem {
  id: string;
  label: string;
  tagline: string;
  category: "socials" | "contact" | "music" | "video" | "embeds" | "heading";
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
  {
    id: "whatsapp",
    label: "WhatsApp",
    category: "contact",
    tagline: "Chat with you on WhatsApp",
    placeholder: "+1 555 010 2233",
    platform: null,
    hint: "Enter your WhatsApp number with country code.",
    buildUrl: (input) => {
      const digits = input.replace(/\D/g, "");
      return digits.length >= 7 ? `https://wa.me/${digits}` : null;
    },
  },
  {
    id: "telegram",
    label: "Telegram",
    category: "contact",
    tagline: "Message you on Telegram",
    placeholder: "@username",
    platform: null,
    hint: "Enter your Telegram username.",
    buildUrl: (input) => {
      const handle = input.trim().replace(/^@/, "");
      return /^[A-Za-z0-9_]{5,32}$/.test(handle) ? `https://t.me/${handle}` : null;
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
  musicRow("spotify", "Spotify", "open.spotify.com/track/...", "Play a Spotify track"),
  musicRow(
    "apple-music",
    "Apple Music",
    "music.apple.com/us/album/...",
    "Play an Apple Music track",
  ),
  musicRow(
    "soundcloud",
    "SoundCloud",
    "soundcloud.com/artist/track",
    "Play a SoundCloud track or set",
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
  videoRow("youtube", "YouTube", "youtube.com/watch?v=...", "Add a YouTube video"),
  videoRow("vimeo", "Vimeo", "vimeo.com/123456789", "Add a Vimeo video"),
];

function embedRow(
  id: string,
  label: string,
  placeholder: string,
  tagline: string,
): CatalogItem {
  return {
    id,
    label,
    category: "embeds",
    tagline,
    placeholder,
    platform: null,
    hint: `Paste a full ${label} link.`,
    buildUrl: (input) => {
      const normalized = normalizeUrl(input);
      const metadata = parseEmbedUrl(normalized);
      const provider =
        id === "google-maps"
          ? "google-maps"
          : id === "google-calendar"
            ? "google-calendar"
            : "typeform";
      return metadata?.provider === provider ? normalized : null;
    },
  };
}

const EMBEDS: CatalogItem[] = [
  embedRow("google-maps", "Google Maps", "google.com/maps?q=...", "Show a map"),
  embedRow(
    "google-calendar",
    "Google Calendar",
    "calendar.google.com/calendar/embed?src=...",
    "Show a calendar",
  ),
  embedRow("typeform", "Typeform", "form.typeform.com/to/...", "Add a form"),
];

const HEADINGS: CatalogItem[] = [
  {
    id: "heading",
    label: "Heading",
    category: "heading",
    tagline: "Group your links under a label",
    placeholder: "Shop, music, contact…",
    platform: null,
    buildUrl: () => null,
    hint: "Headings don't need a URL.",
  },
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
  ...EMBEDS,
  ...HEADINGS,
];

export const CATEGORIES = [
  { id: "socials", label: "Socials" },
  { id: "contact", label: "Contact" },
  { id: "music", label: "Music" },
  { id: "video", label: "Video" },
  { id: "embeds", label: "Apps" },
  { id: "heading", label: "Heading" },
] as const;

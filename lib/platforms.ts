export interface Platform {
  id: string;
  label: string;
  tagline: string;
  placeholder: string;
  profileUrl: (input: string) => string | null;
}

const isFullUrl = (input: string) => /^https?:\/\//i.test(input);

function socialUrl(input: string, base: string, { keepAt = false } = {}): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (isFullUrl(trimmed)) return trimmed;
  const handle = keepAt ? trimmed : trimmed.replace(/^@/, "");
  return handle ? `${base}${keepAt ? handle : encodeURIComponent(handle)}` : null;
}

export const PLATFORMS: Platform[] = [
  {
    id: "instagram",
    label: "Instagram",
    tagline: "Display your posts and reels",
    placeholder: "username or profile URL",
    profileUrl: (input) => socialUrl(input, "https://instagram.com/"),
  },
  {
    id: "x",
    label: "X",
    tagline: "Post updates from your timeline",
    placeholder: "handle or profile URL",
    profileUrl: (input) => socialUrl(input, "https://x.com/"),
  },
  {
    id: "github",
    label: "GitHub",
    tagline: "Show off your repos and code",
    placeholder: "username or profile URL",
    profileUrl: (input) => socialUrl(input, "https://github.com/"),
  },
  {
    id: "youtube",
    label: "YouTube",
    tagline: "Play your latest videos",
    placeholder: "@handle or channel URL",
    profileUrl: (input) => socialUrl(input, "https://youtube.com/", { keepAt: true }),
  },
  {
    id: "tiktok",
    label: "TikTok",
    tagline: "Share your TikToks",
    placeholder: "@handle or profile URL",
    profileUrl: (input) => socialUrl(input, "https://tiktok.com/@"),
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    tagline: "Link your professional profile",
    placeholder: "profile URL",
    profileUrl: (input) => socialUrl(input, "https://linkedin.com/in/"),
  },
];

export function platformById(id: string | null | undefined): Platform | undefined {
  return PLATFORMS.find((platform) => platform.id === id);
}

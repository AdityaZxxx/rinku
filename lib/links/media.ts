export function isIconMedia(imageUrl: string | null | undefined): imageUrl is string {
  return imageUrl != null && imageUrl.startsWith("icon:");
}

export function iconMediaId(imageUrl: string): string {
  return imageUrl.slice("icon:".length);
}

/**
 * Brand glyphs for well-known platforms, as `icon:` media ids. The favicon
 * service covers the long tail; these exist because a fuzzy favicon beside
 * the page's own crisp icons reads as broken.
 */
const PLATFORM_ICONS = {
  "behance.net": "BehanceLogo",
  "discord.com": "DiscordLogo",
  "discord.gg": "DiscordLogo",
  "dribbble.com": "DribbbleLogo",
  "facebook.com": "FacebookLogo",
  "figma.com": "FigmaLogo",
  "github.com": "GithubLogo",
  "instagram.com": "InstagramLogo",
  "linkedin.com": "LinkedinLogo",
  "medium.com": "MediumLogo",
  "pinterest.com": "PinterestLogo",
  "reddit.com": "RedditLogo",
  "snapchat.com": "SnapchatLogo",
  "spotify.com": "SpotifyLogo",
  "t.me": "TelegramLogo",
  "telegram.me": "TelegramLogo",
  "threads.com": "ThreadsLogo",
  "threads.net": "ThreadsLogo",
  "tiktok.com": "TiktokLogo",
  "twitch.tv": "TwitchLogo",
  "twitter.com": "XLogo",
  "wa.me": "WhatsappLogo",
  "whatsapp.com": "WhatsappLogo",
  "x.com": "XLogo",
  "youtu.be": "YoutubeLogo",
  "youtube.com": "YoutubeLogo",
} satisfies Record<string, string>;

/** Brand icon for a hostname or registrable domain: an `icon:` id, or null. */
export function platformIconMedia(host: string): string | null {
  const normalized = host.toLowerCase();
  for (const [base, icon] of Object.entries(PLATFORM_ICONS)) {
    if (normalized === base || normalized.endsWith(`.${base}`)) {
      return `icon:${icon}`;
    }
  }
  return null;
}

/** Brand icon for a full URL: an `icon:` id, or null. */
export function platformIconMediaForUrl(url: string): string | null {
  try {
    return platformIconMedia(new URL(url).hostname);
  } catch {
    return null;
  }
}

import type { Profile } from "@/lib/db/schema";

export type DiscoverabilityLevel = "weak" | "fair" | "strong";

export type DiscoverabilitySignalId =
  | "indexing"
  | "title"
  | "description"
  | "keywords"
  | "share-image";

export interface DiscoverabilitySignal {
  id: DiscoverabilitySignalId;
  label: string;
  met: boolean;
  /**
   * How much the signal counts toward the level, mirroring what search
   * engines actually weigh: the title dominates on-page relevance, the
   * description drives clicks, and meta keywords are a footnote. The gate
   * carries zero: it decides the level, it is not a point to earn.
   */
  weight: number;
  /** The actionable fix shown under the label while the signal is unmet. */
  hint: string;
}

export interface DiscoverabilityStrength {
  level: DiscoverabilityLevel;
  /** True while robots noindex holds the level at Weak. */
  gated: boolean;
  signals: DiscoverabilitySignal[];
}

/**
 * Ranks how findable the profile is by search engines and shared links, from
 * the fields the page itself exposes. Weights follow what engines reward:
 * the title carries on-page relevance (x3), the description earns the click
 * (x2), keywords and the share image are minor (x1 each). Search indexing is
 * a gate rather than a weighted point: with robots noindex nothing else can
 * matter, so the level bottoms out at Weak. Strong means every signal met.
 *
 * Title and description count the direct SEO fields first, with the profile
 * title and bio as their fallbacks; the share image falls back the same way
 * (OG image, then banner, then avatar). Every fix therefore lands in the SEO
 * section, one card above the rating.
 */
export function discoverabilityStrength(profile: Profile): DiscoverabilityStrength {
  const signals: DiscoverabilitySignal[] = [
    {
      id: "indexing",
      label: "Search indexing on",
      met: profile.searchIndexing,
      weight: 0,
      hint: "Search engines cannot list the page while this is off.",
    },
    {
      id: "title",
      label: "Search result title",
      met: Boolean(profile.metaTitle?.trim() || profile.title?.trim()),
      weight: 3,
      hint: "Add a page title: it becomes the headline of the search result.",
    },
    {
      id: "description",
      label: "Search description",
      met: Boolean(profile.metaDescription?.trim() || profile.bio?.trim()),
      weight: 2,
      hint: "Add a page description: it shows under the title in search results.",
    },
    {
      id: "keywords",
      label: "Keywords chosen",
      met: Boolean(profile.keywords?.trim()),
      weight: 1,
      hint: "They tell engines which topics the page covers.",
    },
    {
      id: "share-image",
      label: "Share image ready",
      met: Boolean(profile.ogImagePath || profile.bannerPath || profile.avatarPath),
      weight: 1,
      hint: "Upload a share image: it shows whenever the page is linked or shared.",
    },
  ];

  const earned = signals.reduce(
    (sum, signal) => sum + (signal.met ? signal.weight : 0),
    0,
  );
  const total = signals.reduce((sum, signal) => sum + signal.weight, 0);
  const gated = !profile.searchIndexing;
  const allMet = signals.every((signal) => signal.met);
  const level: DiscoverabilityLevel = gated
    ? "weak"
    : allMet
      ? "strong"
      : earned >= total / 2
        ? "fair"
        : "weak";
  return { level, gated, signals };
}

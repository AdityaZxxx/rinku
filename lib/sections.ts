/**
 * The sections a profile's settings live under. Mirrors username_is_reserved
 * in the database: a route using one must be reserved there too, or a profile
 * could claim the path.
 */
export const EDIT_SECTIONS = [
  "overview",
  "links",
  "profile",
  "appearance",
  "analytics",
  "settings",
] as const;

/**
 * The gate pattern for the profile-scoped paths — /:username/links and friends,
 * so a prefix match cannot find them. Auth is the proxy's job; ownership
 * (does this account own that username) is the edit layout's.
 */
export const EDIT_SECTION = new RegExp(
  `^\\/[^/]+\\/(${EDIT_SECTIONS.join("|")})(?:\\/|$)`,
);

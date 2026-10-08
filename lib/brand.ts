/**
 * The brand in one place: the name shown in copy and metadata, and the
 * canonical origin the site is served from. Nothing else should hardcode
 * either; import from here instead.
 */
export const BRAND_NAME = "Rinku";

/**
 * Canonical origin for absolute URLs. `||`, not `??`: a blank value in .env
 * must fall back rather than break URL construction. When the variable is
 * unset, client code uses the origin it is actually served from, so every
 * deployment stays correct without configuration; the server falls back to
 * the localhost metadataBase convention.
 */
export function siteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL || "";
  if (configured) {
    return configured.replace(/\/+$/, "");
  }
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return "http://localhost:3000";
}

/** The public address of a profile page. */
export function profileUrl(username: string): string {
  return `${siteUrl()}/${username}`;
}

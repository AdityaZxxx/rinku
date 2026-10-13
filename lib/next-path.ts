import type { Route } from "next";

/**
 * Only ever a site-relative path. A value like `//evil.example` would be read as
 * a protocol-relative URL by the browser, turning the redirect into an open
 * redirect, and `https://...` would leave the app entirely.
 */
export function safeNextPath(candidate: string | null | undefined): Route {
  if (!candidate) return "/dashboard";
  if (!candidate.startsWith("/") || candidate.startsWith("//")) return "/dashboard";
  // SAFETY: the two guards above reject anything that is not a site-relative
  // path, so the remaining value is safe to hand to the router. It cannot be
  // narrowed further because the route union is only known for literals.
  return candidate as Route;
}

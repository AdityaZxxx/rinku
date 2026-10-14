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

/**
 * Marks a path built at runtime from this app's own route segments as a
 * Route. The generated route union lists literal paths only, so a runtime
 * template can never narrow on its own; the segments must therefore come
 * from this app's enums and validated usernames, never from external input.
 * For unvalidated strings use safeNextPath instead.
 */
export function typedRoute(path: string): Route {
  // SAFETY: contract above; the segments are the app's own, so the path
  // names one of the app's routes.
  return path as Route;
}

/**
 * Supabase credentials, resolved lazily.
 *
 * Two deliberate choices here:
 *
 * 1. Each variable is read as a full literal `process.env.NEXT_PUBLIC_*`
 *    expression. Next.js substitutes those at build time by literal text match;
 *    a dynamic lookup like `process.env[name]` is never inlined and would read
 *    `undefined` in the browser bundle.
 *
 * 2. Nothing throws at module scope. `proxy.ts` imports this module, so an
 *    eager throw would turn a missing env var into a 500 on every page of the
 *    site, including ones that never touch the database. Failing on first use
 *    keeps the blast radius to the routes that actually need Supabase.
 */

export function hasSupabaseEnv(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}

/**
 * The shape is inferred rather than annotated: both fields come from a truthiness
 * check above, so an explicit annotation would only restate what the compiler
 * already knows.
 */
export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    throw new Error(
      "Supabase is not configured. Copy .env.example to .env.local and set " +
        "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
    );
  }

  return { url, publishableKey };
}

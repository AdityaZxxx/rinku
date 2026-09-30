import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

import { getSupabaseEnv, hasSupabaseEnv } from "@/lib/supabase/env";

/**
 * Runs before every render to keep the Supabase session fresh.
 *
 * `getClaims()` verifies the access token signature on each call. It never
 * trusts the cookie contents, so a forged `sb-...-auth-token` cannot pass as a
 * signed-in user. The cookie alone is attacker-controllable, so anything that
 * gates on identity must go through this or a `getUserId()` helper.
 */
export async function proxy(request: NextRequest) {
  // Without credentials there is no session to refresh. Returning early keeps
  // the site browsable on a fresh clone instead of 500-ing every request.
  if (!hasSupabaseEnv()) {
    return NextResponse.next({ request });
  }

  const { url, publishableKey } = getSupabaseEnv();
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        // Write to the request so downstream Server Components read the
        // refreshed token instead of trying to refresh the same one again.
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        // Rebuild the response so the browser replaces its stale token.
        supabaseResponse = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          supabaseResponse.cookies.set(name, value, options);
        }
        // A response carrying Set-Cookie must never be stored by a CDN, or one
        // visitor's session could be replayed to the next.
        for (const [key, value] of Object.entries(headers)) {
          supabaseResponse.headers.set(key, value);
        }
      },
    },
  });

  // Do not remove: this call is what triggers the refresh, and the writes above
  // are what persist it. Removing it silently signs users out.
  await supabase.auth.getClaims();

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Run on every page and API request, but skip static assets and images:
     * an unmatched route can block CSS, JS, or avatar loading.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};

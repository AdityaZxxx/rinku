import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import { getSupabaseEnv } from "./env";

/**
 * Request-scoped Supabase client for Server Components, Server Actions, and
 * Route Handlers.
 *
 * `cookies()` is async as of Next.js 16, so this function is async too. Never
 * hoist the result to module scope: the cookie jar belongs to a single request,
 * and sharing a client across requests leaks one visitor's session into
 * another's response.
 */
export async function createClient() {
  const cookieStore = await cookies();
  const { url, publishableKey } = getSupabaseEnv();

  return createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        // A Server Component cannot write cookies or response headers, so this
        // throws and is swallowed. `proxy.ts` runs before every render and
        // owns writing both, which is why a session refresh there is not lost.
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Intentionally ignored: see comment above.
        }
      },
    },
  });
}

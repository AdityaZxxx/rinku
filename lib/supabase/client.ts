import { createBrowserClient } from "@supabase/ssr";

import { getSupabaseEnv } from "./env";

/**
 * Browser-side Supabase client. `createBrowserClient` is a singleton under the
 * hood, so calling this from many components still yields one instance.
 */
export function createClient() {
  const { url, publishableKey } = getSupabaseEnv();
  return createBrowserClient(url, publishableKey);
}

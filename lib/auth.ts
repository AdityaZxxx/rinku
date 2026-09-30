import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import "server-only";

/**
 * `getClaims()` verifies the token signature; `getSession()` only reads the
 * cookie, which a client can forge. `cache()` keeps a layout and the page under
 * it from verifying twice.
 */
export const getClaims = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error) throw error;

  return data?.claims ?? null;
});

export async function getUserId(): Promise<string | null> {
  const claims = await getClaims();
  return claims?.sub ?? null;
}

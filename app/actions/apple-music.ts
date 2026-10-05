"use server";

import * as z from "zod";

import { searchAppleMusicLibrary, type AppleMusicResult } from "@/lib/apple-music";
import { createClient } from "@/lib/supabase/server";

export async function searchAppleMusic(input: {
  query: string;
}): Promise<{ results: AppleMusicResult[] } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Your session expired. Sign in again to continue." };
  }

  const parsed = z
    .object({ query: z.string().trim().min(2, "Type at least 2 characters.").max(100) })
    .safeParse(input);
  if (!parsed.success) {
    return { error: "Type at least 2 characters." };
  }

  const results = await searchAppleMusicLibrary(parsed.data.query);
  if (results === null) {
    return {
      error: "Apple Music search isn't available right now. Paste a link instead.",
    };
  }
  return { results };
}

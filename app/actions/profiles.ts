"use server";

import { createClient } from "@/lib/supabase/server";

export async function createProfile(input: {
  username: string;
  displayName?: string;
}): Promise<{ username: string } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Your session expired. Sign in again to continue." };
  }

  const { error } = await supabase.from("profiles").insert({
    user_id: user.id,
    username: input.username,
    display_name: input.displayName?.trim() || null,
  });

  if (error) {
    console.error("[profiles] createProfile failed", error.message);
    return { error: error.message };
  }

  return { username: input.username };
}

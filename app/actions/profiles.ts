"use server";

import { eq } from "drizzle-orm";

import { profiles } from "@/lib/db/schema";
import { withUserDb } from "@/lib/db/with-user";
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

export async function deleteProfile(input: {
  username: string;
}): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Your session expired. Sign in again to continue." };
  }

  const [profile] = await withUserDb(user.id, (tx) =>
    tx
      .select({ id: profiles.id })
      .from(profiles)
      .where(eq(profiles.username, input.username))
      .limit(1),
  );
  if (!profile) {
    return { error: "Profile not found." };
  }

  const { data: objects, error: listError } = await supabase.storage
    .from("avatars")
    .list(profile.id);
  if (listError) {
    console.error("[profiles] deleteProfile storage list failed", listError.message);
    return { error: "Checking this profile's files failed. Try again." };
  }
  if (objects.length > 0) {
    const { error } = await supabase.storage
      .from("avatars")
      .remove(objects.map((object) => `${profile.id}/${object.name}`));
    if (error) {
      console.error("[profiles] deleteProfile storage cleanup failed", error.message);
      return { error: "Deleting this profile's files failed. Try again." };
    }
  }

  const deleted = await withUserDb(user.id, (tx) =>
    tx.delete(profiles).where(eq(profiles.id, profile.id)).returning({ id: profiles.id }),
  );
  if (deleted.length === 0) {
    return { error: "Profile not found." };
  }

  return { ok: true };
}

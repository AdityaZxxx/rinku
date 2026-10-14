"use server";

import { updateTag } from "next/cache";
import { eq } from "drizzle-orm";
import * as z from "zod";

import { PUBLIC_PROFILE_TAG } from "@/lib/db/public-cache";
import { profiles, type Profile } from "@/lib/db/schema";
import { withUserDb } from "@/lib/db/with-user";
import { log } from "@/lib/log";
import { profileBasicsSchema } from "@/lib/profiles/schema";
import { createClient } from "@/lib/supabase/server";

export async function getProfile(input: {
  username: string;
}): Promise<Profile | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Your session expired. Sign in again to continue." };
  }

  const [profile] = await withUserDb(user.id, (tx) =>
    tx.select().from(profiles).where(eq(profiles.username, input.username)).limit(1),
  );
  if (!profile || profile.userId !== user.id) {
    return { error: "Profile not found." };
  }
  return profile;
}

export async function updateProfile(input: {
  username: string;
  title: string;
  bio: string;
}): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Your session expired. Sign in again to continue." };
  }

  const parsed = profileBasicsSchema.extend({ username: z.string() }).safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "That input was not valid." };
  }

  const updated = await withUserDb(user.id, (tx) =>
    tx
      .update(profiles)
      .set({
        title: parsed.data.title.trim() || null,
        bio: parsed.data.bio.trim() || null,
        updatedAt: new Date(),
      })
      .where(eq(profiles.username, parsed.data.username))
      .returning({ id: profiles.id }),
  );
  if (updated.length === 0) {
    return { error: "This profile could not be saved." };
  }
  updateTag(PUBLIC_PROFILE_TAG);
  return { ok: true };
}

export async function createProfile(input: {
  username: string;
  title?: string;
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
    title: input.title?.trim() || null,
  });

  if (error) {
    log.error("profiles", "createProfile failed", error.message);
    return { error: "Setting up your profile failed. Try again." };
  }

  updateTag(PUBLIC_PROFILE_TAG);
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

  const failures = await Promise.all(
    (["avatars", "banners", "wallpapers", "og-images"] as const).map(async (bucket) => {
      const { data: objects, error: listError } = await supabase.storage
        .from(bucket)
        .list(profile.id);
      if (listError) {
        return listError.message;
      }
      if (objects.length === 0) {
        return null;
      }
      const { error } = await supabase.storage
        .from(bucket)
        .remove(objects.map((object) => `${profile.id}/${object.name}`));
      return error ? error.message : null;
    }),
  );
  const failure = failures.find((message) => message !== null);
  if (failure) {
    log.error("profiles", "deleteProfile storage cleanup failed", failure);
    return { error: "Deleting this profile's files failed. Try again." };
  }

  const deleted = await withUserDb(user.id, (tx) =>
    tx.delete(profiles).where(eq(profiles.id, profile.id)).returning({ id: profiles.id }),
  );
  if (deleted.length === 0) {
    return { error: "Profile not found." };
  }

  updateTag(PUBLIC_PROFILE_TAG);
  return { ok: true };
}

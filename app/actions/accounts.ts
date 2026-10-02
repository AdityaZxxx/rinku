"use server";

import { deleteAuthUser } from "@/lib/db/account";
import { getProfiles } from "@/lib/db/profile";
import { createClient } from "@/lib/supabase/server";

export async function deleteAccount(): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Your session expired. Sign in again to continue." };
  }

  const profiles = await getProfiles(user.id);
  const buckets = ["avatars", "banners"] as const;
  const failures = await Promise.all(
    profiles.flatMap((profile) =>
      buckets.map(async (bucket) => {
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
    ),
  );
  const failure = failures.find((message) => message !== null);
  if (failure) {
    console.error("[accounts] deleteAccount storage cleanup failed", failure);
    return { error: "Deleting your files failed. Try again." };
  }

  try {
    await deleteAuthUser(user.id);
  } catch (error) {
    console.error("[accounts] deleteAccount failed", error);
    return {
      error:
        error instanceof Error
          ? error.message
          : "Deleting your account failed. Try again.",
    };
  }

  await supabase.auth.signOut();

  return { ok: true };
}

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
  const listings = await Promise.all(
    profiles.map(async (profile) => ({
      profile,
      result: await supabase.storage.from("avatars").list(profile.id),
    })),
  );
  for (const { result } of listings) {
    if (result.error) {
      console.error("[accounts] deleteAccount storage list failed", result.error.message);
      return { error: "Checking your files failed. Try again." };
    }
  }
  const paths = listings.flatMap(({ profile, result }) =>
    (result.data ?? []).map((object) => `${profile.id}/${object.name}`),
  );
  if (paths.length > 0) {
    const { error } = await supabase.storage.from("avatars").remove(paths);
    if (error) {
      console.error("[accounts] deleteAccount storage cleanup failed", error.message);
      return { error: "Deleting your files failed. Try again." };
    }
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

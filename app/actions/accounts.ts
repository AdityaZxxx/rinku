"use server";

import { deleteAuthUser } from "@/lib/db/account";
import { getProfiles } from "@/lib/db/profile";
import { log } from "@/lib/log";
import { createClient } from "@/lib/supabase/server";

const PASSWORD_MIN = 8;
const PASSWORD_MAX = 72;

export async function changePassword(input: {
  currentPassword: string;
  newPassword: string;
}): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Your session expired. Sign in again to continue." };
  }
  if (!user.email) {
    return { error: "Changing your password failed. Try again." };
  }

  const { currentPassword, newPassword } = input;
  if (currentPassword === newPassword) {
    return { error: "Choose a password different from your current one." };
  }
  if (newPassword.length < PASSWORD_MIN || newPassword.length > PASSWORD_MAX) {
    return { error: `Use between ${PASSWORD_MIN} and ${PASSWORD_MAX} characters.` };
  }

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });
  if (signInError) {
    log.warn("accounts", "changePassword reauth failed", signInError.message);
    return { error: "That current password is not right." };
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) {
    log.error("accounts", "changePassword failed", error.message);
    return { error: "Changing your password failed. Try again." };
  }

  return { ok: true };
}

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
    log.error("accounts", "deleteAccount storage cleanup failed", failure);
    return { error: "Deleting your files failed. Try again." };
  }

  try {
    await deleteAuthUser(user.id);
  } catch (error) {
    log.error(
      "accounts",
      "deleteAccount failed",
      error instanceof Error ? error.message : String(error),
    );
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

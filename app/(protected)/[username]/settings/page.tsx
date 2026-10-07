import { notFound } from "next/navigation";
import type { EditorArea, SaveMode } from "@/lib/profiles";

import { ChangeUsernameSection } from "@/components/settings/change-username-section";
import { DeleteProfileSection } from "@/components/settings/delete-profile-section";
import { SaveModeSection } from "@/components/settings/save-mode-section";
import { SeoSection } from "@/components/settings/seo-section";
import { getUserId } from "@/lib/auth";
import { getEditorSettings } from "@/lib/db/editor";
import { getProfileByUsername } from "@/lib/db/profile";

export const metadata = { title: "Profile settings" };

export default async function ProfileSettingsPage({
  params,
}: PageProps<"/[username]/settings">) {
  const { username } = await params;
  const userId = await getUserId();
  if (!userId) {
    notFound();
  }

  const profile = await getProfileByUsername(userId, username);
  if (!profile || profile.userId !== userId) {
    notFound();
  }

  const settings = await getEditorSettings(userId, profile.id);
  // SAFETY: each column is constrained to this union by a database CHECK and
  // saveModeSchema, so the persisted values narrow safely.
  const initial = {
    links: settings.linksSaveMode as SaveMode,
    profile: settings.profileSaveMode as SaveMode,
    appearance: settings.appearanceSaveMode as SaveMode,
  } satisfies Record<EditorArea, SaveMode>;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 p-4 sm:p-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-lg font-medium">Profile settings</h1>
        <p className="text-muted-foreground max-w-[65ch] text-sm leading-normal text-pretty">
          Change your username, search settings, or editing mode. You can also delete this
          profile.
        </p>
      </div>
      <SaveModeSection profileId={profile.id} initial={initial} />
      <ChangeUsernameSection username={username} profileId={profile.id} />
      <SeoSection
        profileId={profile.id}
        username={username}
        initial={{
          metaTitle: profile.metaTitle ?? "",
          metaDescription: profile.metaDescription ?? "",
          keywords: profile.keywords ?? "",
          searchIndexing: profile.searchIndexing,
        }}
        fallbackTitle={`${profile.displayName?.trim() || username} (@${username})`}
        fallbackDescription={profile.bio ?? ""}
        initialOgImagePath={profile.ogImagePath}
      />
      <DeleteProfileSection username={username} />
    </div>
  );
}

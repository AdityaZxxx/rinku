import { notFound } from "next/navigation";
import type { EditorArea, SaveMode } from "@/lib/profiles/schema";

import { ChangeUsernameSection } from "@/components/settings/change-username-section";
import { DeleteProfileSection } from "@/components/settings/delete-profile-section";
import { DiscoverabilitySection } from "@/components/settings/discoverability-section";
import { SaveModeSection } from "@/components/settings/save-mode-section";
import { SeoSection } from "@/components/settings/seo-section";
import {
  SettingsToc,
  SettingsTocSheet,
  type SettingsTocItem,
} from "@/components/settings/settings-toc";
import { Separator } from "@/components/ui/separator";
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
  const initial = {
    links: settings.linksSaveMode,
    profile: settings.profileSaveMode,
    appearance: settings.appearanceSaveMode,
  } satisfies Record<EditorArea, SaveMode>;

  const tocItems = [
    { id: "editing", label: "Editing" },
    { id: "username", label: "Username" },
    { id: "seo", label: "SEO and discoverability" },
    { id: "delete", label: "Delete profile", destructive: true },
  ] satisfies SettingsTocItem[];

  return (
    <>
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col p-4 sm:p-6 lg:max-w-5xl lg:flex-row lg:gap-10">
        <div className="flex w-full min-w-0 flex-1 flex-col gap-8">
          <div className="flex flex-col gap-2">
            <h1 className="text-lg font-medium">Profile settings</h1>
            <p className="text-muted-foreground max-w-[65ch] text-sm leading-normal text-pretty">
              Change your username, search settings, or editing mode. You can also delete
              this profile.
            </p>
          </div>
          <section id="editing" className="scroll-mt-20">
            <SaveModeSection profileId={profile.id} initial={initial} />
          </section>
          <section id="username" className="scroll-mt-20">
            <ChangeUsernameSection username={username} profileId={profile.id} />
          </section>
          <section id="seo" className="scroll-mt-20 rounded-2xl border p-5">
            <SeoSection
              profileId={profile.id}
              username={username}
              initial={{
                metaTitle: profile.metaTitle ?? "",
                metaDescription: profile.metaDescription ?? "",
                keywords: profile.keywords ?? "",
                searchIndexing: profile.searchIndexing,
              }}
              fallbackTitle={`${profile.title?.trim() || username} (@${username})`}
              fallbackDescription={profile.bio ?? ""}
              initialOgImagePath={profile.ogImagePath}
            />
            <Separator className="my-5" />
            <DiscoverabilitySection username={username} profile={profile} />
          </section>
          <section id="delete" className="scroll-mt-20">
            <DeleteProfileSection username={username} />
          </section>
        </div>
        <aside className="hidden w-52 shrink-0 lg:block">
          <div className="sticky top-16">
            <SettingsToc items={tocItems} />
          </div>
        </aside>
      </div>
      <SettingsTocSheet items={tocItems} />
    </>
  );
}

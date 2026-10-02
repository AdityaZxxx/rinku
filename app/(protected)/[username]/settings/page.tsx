import { ChangeUsernameSection } from "@/components/settings/change-username-section";
import { DeleteProfileSection } from "@/components/settings/delete-profile-section";

export const metadata = { title: "Profile settings" };

export default async function ProfileSettingsPage({
  params,
}: PageProps<"/[username]/settings">) {
  const { username } = await params;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 p-4 sm:p-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-lg font-medium">Profile settings</h1>
        <p className="text-muted-foreground text-sm">
          Change your username or delete this profile.
        </p>
      </div>
      <ChangeUsernameSection username={username} />
      <DeleteProfileSection username={username} />
    </div>
  );
}

import { DeleteProfileSection } from "@/components/settings/delete-profile-section";

export const metadata = { title: "Profile settings" };

export default async function ProfileSettingsPage({
  params,
}: PageProps<"/[username]/settings">) {
  const { username } = await params;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 p-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-lg font-medium">Profile settings</h1>
        <p className="text-muted-foreground text-sm">
          The profile's name, handle, and bio are on the way.
        </p>
      </div>
      <DeleteProfileSection username={username} />
    </div>
  );
}

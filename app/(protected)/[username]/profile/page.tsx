import { notFound } from "next/navigation";

import { ProfileEditor } from "@/components/profile/profile-editor";
import { getUserId } from "@/lib/auth";
import { getProfileByUsername } from "@/lib/db/profile";

export const metadata = { title: "Profile" };

export default async function ProfilePage({ params }: PageProps<"/[username]/profile">) {
  const { username } = await params;
  const userId = await getUserId();
  if (!userId) {
    notFound();
  }

  const profile = await getProfileByUsername(userId, username);
  if (!profile || profile.userId !== userId) {
    notFound();
  }

  return <ProfileEditor username={username} initialProfile={profile} />;
}

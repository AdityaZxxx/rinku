import { redirect } from "next/navigation";

import { getUserId } from "@/lib/auth";
import { getProfile } from "@/lib/db/profile";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const userId = await getUserId();
  if (!userId) {
    redirect("/login");
  }

  const [profile] = await getProfile(userId);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6">
      <h1 className="text-lg font-medium">Dashboard</h1>
      {profile ? (
        <p className="text-muted-foreground text-sm">
          Signed in as <span className="text-foreground">{profile.username}</span>
        </p>
      ) : (
        <p className="text-muted-foreground max-w-sm text-center text-sm">
          No profile is linked to this account. Sign out and create a new account.
        </p>
      )}
    </div>
  );
}

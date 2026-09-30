import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";

import { signOut } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { getUserId } from "@/lib/auth";
import { profiles } from "@/lib/db/schema";
import { withUserDb } from "@/lib/db/with-user";

export const metadata = { title: "Dashboard" };

/**
 * Placeholder. The real dashboard is later work; this exists so the post-auth
 * redirect lands somewhere real and the signup trigger is observable end to end.
 */
export default async function DashboardPage() {
  const userId = await getUserId();
  if (!userId) {
    redirect("/login?next=%2Fdashboard");
  }

  const [profile] = await withUserDb(userId, (tx) =>
    tx.select().from(profiles).where(eq(profiles.id, userId)).limit(1),
  );

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-2 p-6">
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

      <form action={signOut}>
        <Button type="submit" variant="outline">
          Sign out
        </Button>
      </form>
    </main>
  );
}

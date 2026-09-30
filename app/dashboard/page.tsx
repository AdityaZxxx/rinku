import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";

import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
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

  // The collapse state lives in a cookie set client-side by the sidebar, so it
  // is read here to keep the server render from flashing open on every reload.
  const defaultOpen = (await cookies()).get("sidebar_state")?.value !== "false";

  const [profile] = await withUserDb(userId, (tx) =>
    tx.select().from(profiles).where(eq(profiles.id, userId)).limit(1),
  );

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar user={profile?.username ?? null} />
      <SidebarInset>
        <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger />
        </header>
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
      </SidebarInset>
    </SidebarProvider>
  );
}

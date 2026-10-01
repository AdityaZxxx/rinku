import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { ProfilePicker } from "@/components/dashboard/profile-picker";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { getClaims, getUserId } from "@/lib/auth";
import { getProfiles } from "@/lib/db/profile";

export default async function ProtectedLayout({ children }: LayoutProps<"/">) {
  const userId = await getUserId();
  if (!userId) {
    redirect("/login");
  }

  const [claims, profiles] = await Promise.all([getClaims(), getProfiles(userId)]);
  if (profiles.length === 0) {
    redirect("/onboarding");
  }

  const defaultOpen = (await cookies()).get("sidebar_state")?.value !== "false";

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar profiles={profiles} email={claims?.email ?? null} />
      <SidebarInset>
        <header className="flex h-12 shrink-0 items-center justify-between gap-2 border-b px-4">
          <SidebarTrigger />
          <ProfilePicker profiles={profiles} />
        </header>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { ProfilePicker } from "@/components/dashboard/profile-picker";
import { UnsavedChangesProvider } from "@/components/profile/unsaved-changes-provider";
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
    <UnsavedChangesProvider>
      <SidebarProvider defaultOpen={defaultOpen}>
        <a
          href="#main"
          className="bg-background focus:ring-ring absolute top-2 left-2 z-50 -translate-y-[calc(100%+1rem)] rounded-xl border px-3 py-2 text-sm font-medium opacity-0 transition-transform focus:translate-y-0 focus:opacity-100"
        >
          Skip to content
        </a>
        <AppSidebar profiles={profiles} email={claims?.email ?? null} />
        <SidebarInset id="main" tabIndex={-1}>
          <header className="bg-background/80 sticky top-0 z-20 flex h-12 shrink-0 items-center justify-between gap-2 border-b px-4 backdrop-blur-sm">
            <SidebarTrigger />
            <ProfilePicker profiles={profiles} />
          </header>
          {children}
        </SidebarInset>
      </SidebarProvider>
    </UnsavedChangesProvider>
  );
}

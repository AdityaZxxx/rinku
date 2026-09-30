import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { getUserId } from "@/lib/auth";
import { getProfile } from "@/lib/db/profile";

export default async function ProtectedLayout({ children }: LayoutProps<"/">) {
  const userId = await getUserId();
  if (!userId) {
    redirect("/login");
  }

  const defaultOpen = (await cookies()).get("sidebar_state")?.value !== "false";

  const [profile] = await getProfile(userId);

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar user={profile?.username ?? null} />
      <SidebarInset>
        <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger />
        </header>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}

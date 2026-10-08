"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import type { profiles } from "@/lib/db/schema";
import {
  ChartBarIcon,
  CaretLeftIcon,
  DotsThreeIcon,
  GearIcon,
  HouseIcon,
  LinkIcon,
  MonitorIcon,
  MoonIcon,
  PaletteIcon,
  RabbitIcon,
  SignOutIcon,
  SquaresFourIcon,
  SunIcon,
  UserCircleIcon,
} from "@phosphor-icons/react";
import { useTheme } from "next-themes";

import { signOut } from "@/app/actions/auth";
import { Kbd } from "@/components/dashboard/kbd";
import {
  GuardedLink,
  useConfirmLeave,
} from "@/components/profile/unsaved-changes-provider";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { BRAND_NAME } from "@/lib/brand";
import {
  NAV_SHORTCUTS,
  navShortcutHref,
  type NavSection,
  type NavShortcut,
} from "@/lib/dashboard/shortcuts";

type Profile = typeof profiles.$inferSelect;

const NAV_ICONS: Record<NavSection, ReactNode> = {
  dashboard: <HouseIcon />,
  overview: <SquaresFourIcon />,
  links: <LinkIcon />,
  profile: <UserCircleIcon />,
  appearance: <PaletteIcon />,
  insights: <ChartBarIcon />,
  settings: <GearIcon />,
};

export function AppSidebar({
  profiles,
  email,
}: {
  profiles: Profile[];
  email: string | null;
}) {
  const { theme, setTheme } = useTheme();
  const { setOpenMobile } = useSidebar();
  const pathname = usePathname();
  const confirmLeave = useConfirmLeave();
  const currentUsername = pathname.split("/")[1];
  const current =
    profiles.find((profile) => profile.username === currentUsername) ?? profiles[0];
  const editing = current?.username ?? "";

  const closeMobile = () => setOpenMobile(false);

  const mainNav = NAV_SHORTCUTS.filter((item) => item.section !== "settings");
  const settingsNav = NAV_SHORTCUTS.find((item) => item.section === "settings");

  function renderNavItem(item: NavShortcut) {
    const href = navShortcutHref(item.section, editing);
    return (
      <SidebarMenuItem key={item.section}>
        <SidebarMenuButton
          isActive={pathname === href}
          aria-keyshortcuts={item.digit}
          tooltip={{
            children: (
              <>
                {item.label}
                <Kbd className="border-background/25 bg-background/20 text-background">
                  {item.digit}
                </Kbd>
              </>
            ),
          }}
          onClick={closeMobile}
          render={<GuardedLink href={href} />}
        >
          {NAV_ICONS[item.section]}
          {item.label}
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex h-12 items-center gap-2 overflow-hidden rounded-xl px-2.5 transition-[padding] duration-200 ease-linear group-data-[collapsible=icon]:px-1.5">
          <RabbitIcon className="size-5 shrink-0" />
          <span className="text-base font-semibold group-data-[collapsible=icon]:hidden">
            {BRAND_NAME}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setOpenMobile(false)}
            aria-label="Close sidebar"
            className="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ml-auto rounded-xl md:hidden"
          >
            <CaretLeftIcon />
          </Button>
        </div>
      </SidebarHeader>

      <SidebarContent className="overflow-x-hidden">
        <nav aria-label="Main" className="flex flex-col gap-2">
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>{mainNav.map(renderNavItem)}</SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarSeparator />

          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>{settingsNav ? renderNavItem(settingsNav) : null}</SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </nav>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={<SidebarMenuButton />}
                className="cursor-pointer pl-2.5"
                aria-label="Account"
                title={email ?? undefined}
              >
                <Avatar className="size-6 shrink-0 group-data-[collapsible=icon]:size-4">
                  <AvatarFallback className="text-xs font-medium">
                    {email?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-muted-foreground truncate group-data-[collapsible=icon]:hidden">
                  {email}
                </span>
                <span className="ml-auto flex size-5 shrink-0 items-center justify-center rounded-md border group-data-[collapsible=icon]:hidden">
                  <DotsThreeIcon className="rotate-90" />
                </span>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="end" className="w-48">
                <DropdownMenuItem
                  render={<GuardedLink href="/account/settings" />}
                  onClick={closeMobile}
                >
                  <GearIcon />
                  Account settings
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuRadioGroup
                  value={theme ?? "system"}
                  onValueChange={(value) => setTheme(value)}
                >
                  <DropdownMenuRadioItem value="light">
                    <SunIcon />
                    Light
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="dark">
                    <MoonIcon />
                    Dark
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="system">
                    <MonitorIcon />
                    System
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => confirmLeave(() => void signOut())}
                >
                  <SignOutIcon />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

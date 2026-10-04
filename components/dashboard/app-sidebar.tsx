"use client";

import type { Route } from "next";
import Link from "next/link";
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
  RabbitIcon,
  SignOutIcon,
  SquaresFourIcon,
  SunIcon,
  UserCircleIcon,
} from "@phosphor-icons/react";
import { useTheme } from "next-themes";

import { signOut } from "@/app/actions/auth";
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

type Profile = typeof profiles.$inferSelect;

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
  const currentUsername = pathname.split("/")[1];
  const current =
    profiles.find((profile) => profile.username === currentUsername) ?? profiles[0];
  const editing = current?.username;

  const editPath = (section: string) =>
    // SAFETY: /:username/<section>, the profile's own edit context; the typed
    // route union is only knowable for literals.
    `/${editing}/${section}` as Route;

  const closeMobile = () => setOpenMobile(false);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex h-12 items-center gap-2 overflow-hidden rounded-xl px-2.5 transition-[padding] duration-200 ease-linear group-data-[collapsible=icon]:px-1.5">
          <RabbitIcon className="size-5 shrink-0" />
          <span className="text-base font-semibold group-data-[collapsible=icon]:hidden">
            Rinku
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
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={pathname === "/dashboard"}
                    tooltip="Dashboard"
                    onClick={closeMobile}
                    render={<Link href="/dashboard" />}
                  >
                    <HouseIcon />
                    Dashboard
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={pathname === `/${editing}/overview`}
                    tooltip="Overview"
                    onClick={closeMobile}
                    render={<Link href={editPath("overview")} />}
                  >
                    <SquaresFourIcon />
                    Overview
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={pathname === `/${editing}/links`}
                    tooltip="Links"
                    onClick={closeMobile}
                    render={<Link href={editPath("links")} />}
                  >
                    <LinkIcon />
                    Links
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={pathname === `/${editing}/profile`}
                    tooltip="Profile"
                    onClick={closeMobile}
                    render={<Link href={editPath("profile")} />}
                  >
                    <UserCircleIcon />
                    Profile
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={pathname === `/${editing}/insights`}
                    tooltip="Insights"
                    onClick={closeMobile}
                    render={<Link href={editPath("insights")} />}
                  >
                    <ChartBarIcon />
                    Insights
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarSeparator />

          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={pathname === `/${editing}/settings`}
                    tooltip="Profile settings"
                    onClick={closeMobile}
                    render={<Link href={editPath("settings")} />}
                  >
                    <GearIcon />
                    Settings
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
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
                  render={<Link href="/account/settings" />}
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

                <DropdownMenuItem variant="destructive" onClick={() => void signOut()}>
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

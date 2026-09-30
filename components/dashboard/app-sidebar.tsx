"use client";

import Link from "next/link";
import {
  CaretLeftIcon,
  DotsThreeIcon,
  HouseIcon,
  MonitorIcon,
  MoonIcon,
  RabbitIcon,
  SignOutIcon,
  SunIcon,
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
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuAction,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

export function AppSidebar({ user }: { user: string | null }) {
  const { theme, setTheme } = useTheme();
  const { setOpenMobile } = useSidebar();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex h-12 items-center gap-2 overflow-hidden rounded-xl px-3 group-data-[collapsible=icon]:p-2">
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

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive
                  tooltip="Dashboard"
                  render={<Link href="/dashboard" />}
                >
                  <HouseIcon />
                  Dashboard
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        {user && (
          <SidebarMenu>
            <SidebarMenuItem>
              <div className="flex h-8 items-center gap-2 overflow-hidden rounded-xl px-3 text-sm">
                <Avatar className="size-6 shrink-0">
                  <AvatarFallback className="text-xs font-medium">
                    {user[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate font-medium">{user}</span>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger render={<SidebarMenuAction />}>
                  <DotsThreeIcon />
                  <span className="sr-only">Account options</span>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="top" align="end" className="w-48">
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

                  <DropdownMenuItem variant="destructive" onSelect={() => void signOut()}>
                    <SignOutIcon />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}

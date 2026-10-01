"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { profiles } from "@/lib/db/schema";
import { CaretDownIcon, PlusIcon } from "@phosphor-icons/react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Profile = typeof profiles.$inferSelect;

export function ProfilePicker({ profiles }: { profiles: Profile[] }) {
  const pathname = usePathname();
  const currentUsername = pathname.split("/")[1];
  const current =
    profiles.find((profile) => profile.username === currentUsername) ?? profiles[0];
  const label = current ? (current.displayName ?? current.username) : null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" className="max-w-56 gap-2 px-2 font-medium" />}
      >
        <Avatar className="size-5 shrink-0">
          <AvatarFallback className="text-[10px] font-medium">
            {(label ?? "?")[0]?.toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <span className="truncate">{label}</span>
        <CaretDownIcon className="shrink-0 opacity-60" />
        <span className="sr-only">Switch profile</span>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Profiles</DropdownMenuLabel>
          {profiles.map((profile) => (
            <DropdownMenuItem
              key={profile.id}
              render={
                // SAFETY: /:username/links, the profile's own edit context; the
                // typed route union is only knowable for literals.
                <Link href={`/${profile.username}/links` as Route} />
              }
            >
              <Avatar className="size-5 shrink-0">
                <AvatarFallback className="text-[10px] font-medium">
                  {(profile.displayName ?? profile.username)[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="truncate">{profile.displayName ?? profile.username}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuItem render={<Link href="/onboarding" />}>
          <PlusIcon />
          Create new profile
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

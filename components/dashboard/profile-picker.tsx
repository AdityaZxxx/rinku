"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { profiles } from "@/lib/db/schema";
import { CheckIcon, CaretDownIcon, PlusIcon } from "@phosphor-icons/react";

import { GuardedLink } from "@/components/profile/unsaved-changes-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { EDIT_SECTIONS } from "@/lib/sections";
import { avatarUrl } from "@/lib/storage";

type Profile = typeof profiles.$inferSelect;

export function ProfilePicker({ profiles }: { profiles: Profile[] }) {
  const pathname = usePathname();
  const segments = pathname.split("/");
  const currentUsername = segments[1];
  const urlProfile = profiles.find((profile) => profile.username === currentUsername);
  const current = urlProfile ?? profiles[0];
  const label = current ? (current.displayName ?? current.username) : null;

  // Switching keeps the section being edited, /firstProfile/links to
  // /secondProfile/links; only a profile-scoped URL carries it over.
  const urlSection = EDIT_SECTIONS.find((section) => section === segments[2]);
  const section = urlProfile && urlSection ? urlSection : "overview";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            className="max-w-56 gap-2 px-2 font-medium"
            title={label ?? undefined}
          />
        }
      >
        <Avatar className="size-5 shrink-0">
          <AvatarImage
            src={current?.avatarPath ? avatarUrl(current.avatarPath) : undefined}
          />
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
                // SAFETY: /:username/:section; the typed route union is only
                // knowable for literals.
                <GuardedLink href={`/${profile.username}/${section}` as Route} />
              }
            >
              <Avatar className="size-5 shrink-0">
                <AvatarImage
                  src={profile.avatarPath ? avatarUrl(profile.avatarPath) : undefined}
                />
                <AvatarFallback className="text-[10px] font-medium">
                  {(profile.displayName ?? profile.username)[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="truncate">{profile.displayName ?? profile.username}</span>
              {profile.id === urlProfile?.id && (
                <CheckIcon className="ms-auto shrink-0" />
              )}
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

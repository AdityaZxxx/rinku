"use client";

import { useState } from "react";
import Link from "next/link";
import type { Link as LinkData, Profile } from "@/lib/db/schema";
import { EyesIcon } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ProfilePreview } from "./profile-preview";

export function MobileDock({
  username,
  profileId,
  initialProfile,
  initialLinks,
}: {
  username: string;
  profileId: string;
  initialProfile: Profile;
  initialLinks: LinkData[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed inset-x-0 bottom-4 z-40 flex justify-center lg:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger render={<Button variant="default" />}>
          <span className="flex flex-col items-center gap-0.5 px-1">
            <EyesIcon className="size-4" />
            <span className="text-[10px] leading-none">Preview</span>
          </span>
        </SheetTrigger>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="border-none bg-transparent p-0 data-[side=bottom]:h-[100dvh] sm:p-0"
        >
          <div className="flex h-full flex-col">
            <div className="flex h-[10dvh] items-center justify-between px-4">
              <SheetClose render={<Button variant="secondary" size="sm" />}>
                Close
              </SheetClose>
              <Button
                variant="secondary"
                size="sm"
                nativeButton={false}
                render={<Link href={`/${username}`} target="_blank" />}
              >
                Visit live page
              </Button>
            </div>
            <div className="bg-background flex-1 overflow-hidden rounded-t-3xl">
              <div className="mx-auto flex h-full w-full max-w-[420px] flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto">
                  <ProfilePreview
                    username={username}
                    profileId={profileId}
                    initialProfile={initialProfile}
                    initialLinks={initialLinks}
                  />
                </div>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

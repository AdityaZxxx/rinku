"use client";

import { useState } from "react";
import type { Link as LinkData } from "@/lib/db/schema";

import { SocialIcon } from "@/components/social-icon";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { linkUrlSchema } from "@/lib/links/model";
import { platformById } from "@/lib/links/platforms";
import { useDeleteLink, useUpdateLink } from "./use-link-mutations";

export function EditSocialDialog({
  link,
  open,
  onOpenChange,
}: {
  link: LinkData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [value, setValue] = useState(link.url);
  const [error, setError] = useState<string | null>(null);
  const update = useUpdateLink(link.profileId);
  const remove = useDeleteLink(link.profileId);
  const busy = update.isPending || remove.isPending;
  const Platform = platformById(link.platform);

  function onSave() {
    const trimmed = value.trim();
    if (!linkUrlSchema.safeParse(trimmed).success) {
      setError("Enter a valid link.");
      return;
    }
    setError(null);
    // The row updates optimistically in useUpdateLink; closing waits for the
    // server so a failure (rollback + toast there) leaves the dialog open.
    update.mutate(
      {
        id: link.id,
        title: Platform?.label ?? link.title,
        url: trimmed,
        variant: link.variant,
        isActive: link.isActive,
      },
      { onSuccess: () => onOpenChange(false) },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SocialIcon id={link.platform ?? ""} className="size-5" />
            Edit {Platform?.label ?? "social"}
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <Label htmlFor="social-url">Profile URL or handle</Label>
          <Input
            id="social-url"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder={Platform?.placeholder}
          />
          {error ? <p className="text-destructive text-sm">{error}</p> : null}
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="destructive"
            disabled={busy}
            onClick={() => {
              setError(null);
              remove.mutate(link.id, {
                onSuccess: () => onOpenChange(false),
                onError: (caught) => {
                  setError(
                    caught instanceof Error
                      ? caught.message
                      : "Removing this link failed. Try again.",
                  );
                },
              });
            }}
          >
            {remove.isPending ? <Spinner /> : null}
            Remove
          </Button>
          <Button type="button" onClick={onSave} disabled={busy}>
            {update.isPending ? <Spinner /> : null}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

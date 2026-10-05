"use client";

import { useState, useTransition } from "react";
import type { Link as LinkData } from "@/lib/db/schema";
import { useQueryClient } from "@tanstack/react-query";

import { updateLink } from "@/app/actions/links";
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
import { linkUrlSchema } from "@/lib/links";
import { platformById } from "@/lib/platforms";
import { useDeleteLink } from "./use-link-mutations";

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
  const [pending, startTransition] = useTransition();
  const queryClient = useQueryClient();
  const remove = useDeleteLink(link.profileId);
  const Platform = platformById(link.platform);

  function onSave() {
    const trimmed = value.trim();
    if (!linkUrlSchema.safeParse(trimmed).success) {
      setError("Enter a valid link.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await updateLink({
        id: link.id,
        title: Platform?.label ?? link.title,
        url: trimmed,
        variant: link.variant,
        isActive: link.isActive,
      });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["links", link.profileId] });
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {Platform ? <SocialIcon id={Platform.id} className="size-5" /> : null}
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
            disabled={pending}
            onClick={() => {
              startTransition(async () => {
                try {
                  await remove.mutateAsync(link.id);
                  onOpenChange(false);
                } catch (caught) {
                  setError(
                    caught instanceof Error ? caught.message : "Removing this failed.",
                  );
                }
              });
            }}
          >
            Remove
          </Button>
          <Button type="button" onClick={onSave} disabled={pending}>
            {pending ? <Spinner /> : null}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

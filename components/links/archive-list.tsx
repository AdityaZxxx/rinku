"use client";

import { useState, useTransition } from "react";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import type { links } from "@/lib/db/schema";
import { CaretLeftIcon, GlobeSimpleIcon, TrashIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { getArchivedLinks } from "@/app/actions/links";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { displayUrl, faviconUrl } from "@/lib/links";
import { useDeleteLink, useRestoreLink } from "./use-link-mutations";

type ArchivedLink = typeof links.$inferSelect;

export function ArchiveList({
  profileId,
  username,
  initialLinks,
}: {
  profileId: string;
  username: string;
  initialLinks: ArchivedLink[];
}) {
  const query = useQuery({
    queryKey: ["links", profileId, "archive"],
    queryFn: async () => {
      const result = await getArchivedLinks(profileId);
      if ("error" in result) {
        throw new Error(result.error);
      }
      return result;
    },
    initialData: initialLinks,
  });
  const archived = Array.isArray(query.data) ? query.data : [];

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-lg font-medium">Archive</h1>
          <p className="text-muted-foreground text-sm">
            Archived links stay restorable here. Delete removes them for good.
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          // SAFETY: /:username/links for the current profile; the typed route
          // union is only knowable for literals.
          render={<Link href={`/${username}/links` as Route} />}
        >
          <CaretLeftIcon />
          Back to links
        </Button>
      </div>

      {query.isError && (
        <output className="text-destructive text-sm">{query.error.message}</output>
      )}

      {archived.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed p-10">
          <p className="text-sm font-medium">Nothing archived</p>
          <p className="text-muted-foreground text-sm">
            Links you archive wait here — restore them or delete them for good.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {archived.map((link) => (
            <ArchivedRow key={link.id} link={link} profileId={profileId} />
          ))}
        </div>
      )}
    </div>
  );
}

function ArchivedRow({ link, profileId }: { link: ArchivedLink; profileId: string }) {
  const restore = useRestoreLink(profileId);
  const remove = useDeleteLink(profileId);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function onRestore() {
    try {
      await restore.mutateAsync(link);
      toast("Link restored");
    } catch (restoreError) {
      toast.error(
        restoreError instanceof Error
          ? restoreError.message
          : "This link could not be restored.",
      );
    }
  }

  function onDelete() {
    setError(null);
    startTransition(async () => {
      try {
        await remove.mutateAsync(link.id);
        setOpen(false);
      } catch (deleteError) {
        setError(
          deleteError instanceof Error
            ? deleteError.message
            : "Deleting this link failed. Try again.",
        );
      }
    });
  }

  const icon = faviconUrl(link.url);

  return (
    <div className="bg-card flex items-center gap-2 rounded-2xl border p-3">
      {icon ? (
        <Image
          unoptimized
          src={icon}
          alt=""
          width={40}
          height={40}
          className="bg-muted size-10 shrink-0 rounded-xl object-contain p-1.5"
        />
      ) : (
        <span className="bg-muted flex size-10 shrink-0 items-center justify-center rounded-xl">
          <GlobeSimpleIcon className="text-muted-foreground size-5" />
        </span>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-sm font-medium">{link.title}</span>
        <span className="text-muted-foreground truncate text-xs">
          {displayUrl(link.url)}
        </span>
      </div>

      <Button type="button" variant="ghost" size="sm" onClick={onRestore}>
        Restore
      </Button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogTrigger render={<Button variant="ghost" size="sm" />}>
          <TrashIcon />
          Delete
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-destructive/10 text-destructive">
              <TrashIcon />
            </AlertDialogMedia>
            <AlertDialogTitle>Delete this link?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes {link.title}. It cannot be restored.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error && <p className="text-destructive text-sm">{error}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={pending}
              onClick={onDelete}
            >
              {pending && <Spinner />}
              Delete link
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

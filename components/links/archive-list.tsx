"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import type { links } from "@/lib/db/schema";
import {
  ArrowCounterClockwiseIcon,
  CaretLeftIcon,
  GlobeSimpleIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { getArchivedLinks } from "@/app/actions/links/link";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useFaviconImage } from "@/components/use-image-failure";
import { displayUrl, faviconUrl } from "@/lib/links/model";
import { typedRoute } from "@/lib/next-path";
import {
  useDeleteArchivedLinks,
  useDeleteLink,
  useRestoreLink,
} from "./use-link-mutations";

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
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 p-4 sm:p-6">
      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-1">
          <h1 className="text-lg font-medium">Archive</h1>
          <p className="text-muted-foreground text-sm">
            Archived links stay restorable here. Delete removes them for good.
          </p>
        </div>
        <div className="flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            size="sm"
            // The ghost's own 12px padding sits between the container edge
            // and its ink; pulling it out lines that ink up with the filled
            // Delete all block on the opposite edge, so both read as inset
            // by the same distance.
            className="-ml-3"
            nativeButton={false}
            render={<Link href={typedRoute(`/${username}/links`)} />}
          >
            <CaretLeftIcon />
            Back to links
          </Button>
          <DeleteAllArchived profileId={profileId} count={archived.length} />
        </div>
      </div>

      {query.isError && (
        <output className="text-destructive text-sm">{query.error.message}</output>
      )}

      {archived.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed p-6 text-center sm:p-10">
          <p className="text-sm font-medium">Nothing archived</p>
          <p className="text-muted-foreground max-w-sm text-sm">
            Links you archive wait here. Restore them or delete them permanently.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {archived.map((link) => (
            <ArchivedRow key={link.id} link={link} />
          ))}
        </div>
      )}
    </div>
  );
}

function DeleteAllArchived({ profileId, count }: { profileId: string; count: number }) {
  const removeAll = useDeleteArchivedLinks(profileId);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function onDelete() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await removeAll.mutateAsync();
        setOpen(false);
        toast(
          `Deleted ${result.count} archived ${result.count === 1 ? "link" : "links"}`,
        );
      } catch (deleteError) {
        setError(
          deleteError instanceof Error
            ? deleteError.message
            : "Emptying the archive failed. Try again.",
        );
      }
    });
  }

  // The dialog stays mounted even when the count hits zero: the optimistic
  // clear empties the list mid-flight, and a failure has to keep its inline
  // error and open dialog rather than unmounting with the trigger.
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      {count > 0 && (
        <AlertDialogTrigger
          render={
            // ml-auto keeps the button on the trailing edge even when the
            // header wraps on narrow screens.
            <Button variant="destructive" size="sm" className="ml-auto">
              Delete all
            </Button>
          }
        />
      )}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-destructive/10 text-destructive">
            <TrashIcon />
          </AlertDialogMedia>
          <AlertDialogTitle>Delete all archived links?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently deletes every archived link. They cannot be restored.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && <p className="text-destructive text-sm">{error}</p>}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" disabled={pending} onClick={onDelete}>
            {pending && <Spinner />}
            Delete all
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function ArchivedRow({ link }: { link: ArchivedLink }) {
  const restore = useRestoreLink(link.profileId);
  const remove = useDeleteLink(link.profileId);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function onRestore() {
    try {
      await restore.mutateAsync(link);
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
  // The renderer's 16x16 placeholder for domains with no logo reads as
  // pixelated in the 40px circle: the vector globe below takes its place.
  const [faviconState, onFaviconLoad, onFaviconError, faviconRef] = useFaviconImage(icon);

  return (
    <div className="bg-card flex items-center gap-2 rounded-2xl border p-3">
      {icon && faviconState === "show" ? (
        <Image
          unoptimized
          ref={faviconRef}
          src={icon}
          alt=""
          width={40}
          height={40}
          onLoad={onFaviconLoad}
          onError={onFaviconError}
          className="bg-muted size-10 shrink-0 rounded-full object-contain p-1.5"
        />
      ) : (
        <span className="bg-muted flex size-10 shrink-0 items-center justify-center rounded-full">
          <GlobeSimpleIcon className="text-muted-foreground size-5" />
        </span>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="max-w-full truncate text-sm font-medium">{link.title}</span>
        <span className="text-muted-foreground max-w-full truncate text-xs">
          {displayUrl(link.url)}
        </span>
      </div>

      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={onRestore}
              aria-label={`Restore ${link.title}`}
            >
              <ArrowCounterClockwiseIcon />
            </Button>
          }
        />
        <TooltipContent>Restore</TooltipContent>
      </Tooltip>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <Tooltip>
          <TooltipTrigger
            render={
              <AlertDialogTrigger
                render={
                  <Button
                    variant="destructive"
                    size="icon-sm"
                    aria-label={`Delete ${link.title} permanently`}
                  >
                    <TrashIcon />
                  </Button>
                }
              />
            }
          />
          <TooltipContent>Delete permanently</TooltipContent>
        </Tooltip>
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

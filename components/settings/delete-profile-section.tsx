"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { TrashIcon } from "@phosphor-icons/react";

import { deleteProfile } from "@/app/actions/profiles";
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
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

export function DeleteProfileSection({ username }: { username: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setConfirm("");
    setError(null);
  }

  function onDelete() {
    setError(null);
    startTransition(async () => {
      const result = await deleteProfile({ username });
      if ("error" in result) {
        setError(result.error);
        return;
      }

      setOpen(false);
      router.push("/dashboard");
      router.refresh();
    });
  }

  return (
    <section className="border-destructive/20 bg-destructive/5 rounded-2xl border p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex max-w-sm flex-col gap-2">
          <h2 className="text-destructive text-sm font-medium">Delete profile</h2>
          <p className="text-muted-foreground text-sm">
            Deletes {username}, its links, and its data. This cannot be undone.
          </p>
        </div>

        <AlertDialog
          open={open}
          onOpenChange={(nextOpen) => {
            setOpen(nextOpen);
            if (!nextOpen) {
              reset();
            }
          }}
        >
          <AlertDialogTrigger render={<Button variant="destructive" size="sm" />}>
            Delete profile
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogMedia className="bg-destructive/10 text-destructive">
                <TrashIcon />
              </AlertDialogMedia>
              <AlertDialogTitle>Delete this profile?</AlertDialogTitle>
              <AlertDialogDescription>
                This permanently deletes {username}, its links, and its avatar. Its handle
                becomes available to anyone immediately.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="grid gap-2">
              <label htmlFor="confirm-username" className="text-muted-foreground text-sm">
                Type <span className="text-foreground font-medium">{username}</span> to
                confirm
              </label>
              <Input
                id="confirm-username"
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                autoComplete="off"
                spellCheck={false}
              />
            </div>
            {error && <p className="text-destructive text-sm">{error}</p>}
            <AlertDialogFooter>
              <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                disabled={pending || confirm !== username}
                onClick={onDelete}
              >
                {pending && <Spinner />}
                Delete profile
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </section>
  );
}

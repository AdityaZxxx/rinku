"use client";

import { useEffect, useState } from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import type { ReservedUsername } from "@/lib/profiles/schema";
import { CaretDownIcon, CheckIcon } from "@phosphor-icons/react";
import { useForm } from "@tanstack/react-form";

import {
  checkUsernameAvailability,
  getUsernameHistory,
  reclaimUsername,
  renameProfile,
} from "@/app/actions/profiles";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { usernameSchema } from "@/lib/profiles/schema";
import { cn } from "@/lib/utils";

const holdFormatters = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
});

function reservedUntilLabel(reservedUntil: string | null): string {
  if (!reservedUntil) {
    return "Reserved";
  }
  const date = new Date(reservedUntil);
  if (Number.isNaN(date.getTime())) {
    return "Reserved";
  }
  return `Reserved until ${holdFormatters.format(date)}`;
}

export function ChangeUsernameSection({
  username,
  profileId,
}: {
  username: string;
  profileId: string;
}) {
  const [open, setOpen] = useState(false);
  const [checking, setChecking] = useState(false);
  const [checkedValue, setCheckedValue] = useState(username.toLowerCase());
  const [keepOldUsername, setKeepOldUsername] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const form = useForm({
    defaultValues: { username },
    onSubmit: async ({ value }) => {
      setError(null);
      const candidate = value.username.trim().toLowerCase();
      const result = await renameProfile({
        username,
        newUsername: candidate,
        keepOldUsername,
      });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setOpen(false);
      form.reset();
      setCheckedValue(candidate);
      // SAFETY: /:username/settings for the profile just renamed; the typed
      // route union is only knowable for literals.
      const destination = `/${candidate}/settings` as Route;
      router.replace(destination);
      router.refresh();
    },
  });

  return (
    <section className="rounded-2xl border p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex max-w-sm flex-col gap-2">
          <h2 className="text-sm font-medium">Username</h2>
          <p className="text-muted-foreground text-sm">
            Your page is at{" "}
            <span className="text-foreground font-medium">/{username}</span>. On rename,
            keep your old one for 30 days or release it now.
          </p>
        </div>
        <Dialog
          open={open}
          onOpenChange={(nextOpen) => {
            setOpen(nextOpen);
            if (!nextOpen) {
              form.reset();
              setChecking(false);
              setKeepOldUsername(false);
              setCheckedValue(username.toLowerCase());
              setError(null);
            }
          }}
        >
          <DialogTrigger render={<Button variant="outline" size="sm" />}>
            Change username
          </DialogTrigger>
          <DialogContent className="gap-4 p-5 sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Change username</DialogTitle>
            </DialogHeader>
            <form
              noValidate
              className="flex flex-col gap-4"
              onSubmit={(event) => {
                event.preventDefault();
                if (!form.state.isSubmitting) {
                  form.handleSubmit();
                }
              }}
            >
              <form.Field
                name="username"
                validators={{
                  onChange: usernameSchema,
                  onChangeAsyncDebounceMs: 400,
                  onChangeAsync: async ({ value }) => {
                    const candidate = value.trim().toLowerCase();
                    if (candidate === username) {
                      return undefined;
                    }
                    if (!usernameSchema.safeParse(candidate).success) {
                      return undefined;
                    }
                    setChecking(true);
                    try {
                      const result = await checkUsernameAvailability({ candidate });
                      setCheckedValue(candidate);
                      if ("error" in result) {
                        return { message: result.error };
                      }
                      return result.available
                        ? undefined
                        : { message: "That username is taken." };
                    } finally {
                      setChecking(false);
                    }
                  },
                }}
                children={(field) => {
                  const isInvalid =
                    field.state.meta.isTouched && !field.state.meta.isValid;
                  const candidate = field.state.value.trim().toLowerCase();
                  const isAvailable =
                    !checking &&
                    candidate !== "" &&
                    candidate === checkedValue &&
                    checkedValue !== username &&
                    field.state.meta.isValid;
                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor={field.name}>New username</FieldLabel>
                      <div className="relative">
                        <Input
                          id={field.name}
                          name={field.name}
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(event) =>
                            field.handleChange(event.target.value.toLowerCase())
                          }
                          aria-invalid={isInvalid}
                          autoComplete="off"
                          spellCheck={false}
                          placeholder="your-username"
                        />
                        {checking ? (
                          <Spinner className="absolute top-1/2 right-2 -translate-y-1/2" />
                        ) : isAvailable ? (
                          <CheckIcon
                            aria-hidden="true"
                            className="absolute top-1/2 right-2 size-4 -translate-y-1/2 text-green-600 dark:text-green-500"
                          />
                        ) : null}
                      </div>
                      {isInvalid && <FieldError errors={field.state.meta.errors} />}
                    </Field>
                  );
                }}
              />

              <div className="flex items-start gap-2.5">
                <Checkbox
                  id="keep-old-username"
                  checked={keepOldUsername}
                  onCheckedChange={(checked) => setKeepOldUsername(checked === true)}
                  className="mt-0.5"
                />
                <label htmlFor="keep-old-username" className="flex flex-col gap-0.5">
                  <span className="text-sm">Keep my old username for 30 days</span>
                  <span className="text-muted-foreground text-xs">
                    Otherwise it&apos;s released now and anyone can claim it.
                  </span>
                </label>
              </div>

              <UsernameHistory
                profileId={profileId}
                username={username}
                onReclaim={(handle) => {
                  setOpen(false);
                  // SAFETY: same shape as the rename destination above.
                  const destination = `/${handle}/settings` as Route;
                  router.replace(destination);
                  router.refresh();
                }}
              />

              {error && <FieldError>{error}</FieldError>}

              <DialogFooter>
                <DialogClose
                  render={
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={form.state.isSubmitting}
                    />
                  }
                >
                  Cancel
                </DialogClose>
                <form.Subscribe
                  selector={(state) => ({
                    can: !state.isValidating && state.isValid,
                    matching: state.values.username.trim().toLowerCase() === username,
                    submitting: state.isSubmitting,
                    value: state.values.username,
                  })}
                >
                  {({ can, matching, submitting, value }) => (
                    <Button
                      type="submit"
                      size="sm"
                      disabled={
                        submitting ||
                        checking ||
                        !can ||
                        matching ||
                        value.trim().toLowerCase() !== checkedValue
                      }
                    >
                      {submitting && <Spinner />}
                      Save
                    </Button>
                  )}
                </form.Subscribe>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </section>
  );
}

function UsernameHistory({
  profileId,
  username,
  onReclaim,
}: {
  profileId: string;
  username: string;
  onReclaim: (handle: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<ReservedUsername[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reclaiming, setReclaiming] = useState<string | null>(null);
  // The handle awaiting confirmation; non-null means the gate is open.
  const [confirmHandle, setConfirmHandle] = useState<string | null>(null);
  const [reclaimError, setReclaimError] = useState<string | null>(null);

  // Load once, the first time the list is expanded.
  useEffect(() => {
    if (!open || entries !== null) {
      return;
    }
    let active = true;
    async function load() {
      const result = await getUsernameHistory({ profileId });
      if (!active) {
        return;
      }
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setEntries(result);
    }
    void load();
    return () => {
      active = false;
    };
  }, [open, entries, profileId]);

  async function reclaim(handle: string) {
    setReclaimError(null);
    setReclaiming(handle);
    const result = await reclaimUsername({ currentUsername: username, username: handle });
    setReclaiming(null);
    if ("error" in result) {
      setReclaimError(result.error);
      return;
    }
    setConfirmHandle(null);
    onReclaim(handle);
  }

  return (
    <>
      <div>
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          aria-expanded={open}
          className="flex w-full items-center justify-between gap-2 py-2 text-left text-sm"
        >
          <span className="font-medium">Reserved usernames</span>
          <CaretDownIcon
            aria-hidden="true"
            className={cn(
              "text-muted-foreground size-4 transition-transform duration-150 motion-reduce:transition-none",
              open && "rotate-180",
            )}
          />
        </button>

        {open ? (
          <div className="flex flex-col gap-2 pt-1 pb-2">
            {error ? (
              <p className="text-muted-foreground text-xs">{error}</p>
            ) : entries === null ? (
              <p className="text-muted-foreground text-xs">Loading…</p>
            ) : entries.length === 0 ? (
              <p className="text-muted-foreground text-xs">
                No held usernames. When you rename, choose to keep the old one and it
                shows up here.
              </p>
            ) : (
              <ul className="flex max-h-40 flex-col divide-y overflow-y-auto">
                {entries.map((entry) => (
                  <li
                    key={`${entry.username}-${entry.releasedAt}`}
                    className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0"
                  >
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-sm">/{entry.username}</span>
                      <span className="text-muted-foreground text-xs">
                        {reservedUntilLabel(entry.reservedUntil)}
                      </span>
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="xs"
                      disabled={reclaiming !== null}
                      onClick={() => setConfirmHandle(entry.username)}
                    >
                      {reclaiming === entry.username ? <Spinner /> : null}
                      Reclaim
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}
      </div>

      <AlertDialog
        open={confirmHandle !== null}
        onOpenChange={(next) => {
          setReclaimError(null);
          if (!next) {
            setConfirmHandle(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reclaim /{confirmHandle}?</AlertDialogTitle>
            <AlertDialogDescription>
              Your page moves back to{" "}
              <span className="text-foreground font-medium">/{confirmHandle}</span>, and
              your current username{" "}
              <span className="text-foreground font-medium">/{username}</span> is
              released. Links and content stay the same.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {reclaimError && <p className="text-destructive text-sm">{reclaimError}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={reclaiming !== null}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={reclaiming !== null}
              onClick={() => {
                if (confirmHandle !== null) {
                  void reclaim(confirmHandle);
                }
              }}
            >
              {reclaiming !== null && <Spinner />}
              Reclaim username
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

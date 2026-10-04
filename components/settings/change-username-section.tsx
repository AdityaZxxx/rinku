"use client";

import { useState } from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { CheckIcon } from "@phosphor-icons/react";
import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";

import { checkUsernameAvailability, renameProfile } from "@/app/actions/profiles";
import { Button } from "@/components/ui/button";
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
import { usernameSchema } from "@/lib/profiles";

export function ChangeUsernameSection({ username }: { username: string }) {
  const [open, setOpen] = useState(false);
  const [checking, setChecking] = useState(false);
  const [checkedValue, setCheckedValue] = useState(username.toLowerCase());
  const router = useRouter();

  const form = useForm({
    defaultValues: { username },
    onSubmit: async ({ value }) => {
      const candidate = value.username.trim().toLowerCase();
      const result = await renameProfile({ username, newUsername: candidate });
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast("Username updated");
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
            Your page lives at{" "}
            <span className="text-foreground font-medium">/{username}</span>. Renaming
            moves it there. Your old username remains yours for 30 days.
          </p>
        </div>
        <Dialog
          open={open}
          onOpenChange={(nextOpen) => {
            setOpen(nextOpen);
            if (!nextOpen) {
              form.reset();
              setChecking(false);
              setCheckedValue(username.toLowerCase());
            }
          }}
        >
          <DialogTrigger render={<Button variant="outline" size="sm" />}>
            Change username
          </DialogTrigger>
          <DialogContent>
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
                        : { message: "That username is taken or still in cooldown." };
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

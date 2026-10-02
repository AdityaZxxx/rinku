"use client";

import { useState } from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";

import { checkUsernameAvailability, renameProfile } from "@/app/actions/profiles";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { usernameSchema } from "@/lib/profiles";

export function ChangeUsernameSection({ username }: { username: string }) {
  const [editing, setEditing] = useState(false);
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
      setEditing(false);
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
        {!editing && (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            Change username
          </Button>
        )}
      </div>

      {editing && (
        <form
          noValidate
          className="flex flex-col gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (!form.state.isSubmitting) {
              form.handleSubmit();
            }
          }}
        >
          <div className="flex items-center gap-2 sm:max-w-sm">
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
                  const result = await checkUsernameAvailability({ candidate });
                  if ("error" in result) {
                    return { message: result.error };
                  }
                  return result.available
                    ? undefined
                    : { message: "That username is taken or still in cooldown." };
                },
              }}
              children={(field) => {
                const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field data-invalid={isInvalid} className="flex-1">
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
                      {field.state.meta.isValidating && (
                        <Spinner className="bg-background absolute top-1/2 right-2 -translate-y-1/2" />
                      )}
                    </div>
                    {isInvalid && <FieldError errors={field.state.meta.errors} />}
                  </Field>
                );
              }}
            />
            <div className="flex shrink-0 items-end gap-2 self-start pt-6">
              <form.Subscribe
                selector={(state) => ({
                  can: !state.isValidating && state.isValid,
                  matching: state.values.username.trim().toLowerCase() === username,
                  submitting: state.isSubmitting,
                })}
              >
                {({ can, matching, submitting }) => (
                  <Button
                    type="submit"
                    size="sm"
                    disabled={submitting || !can || matching}
                  >
                    {submitting && <Spinner />}
                    Save
                  </Button>
                )}
              </form.Subscribe>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={form.state.isSubmitting}
                onClick={() => {
                  setEditing(false);
                  form.reset();
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </form>
      )}
    </section>
  );
}

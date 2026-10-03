"use client";

import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";

import { changePassword } from "@/app/actions/accounts";
import { PasswordInput } from "@/components/auth/password-input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";

function newPasswordError(
  value: string,
  currentPassword: string,
): { message: string } | undefined {
  if (value.length < 8) return { message: "Use at least 8 characters." };
  if (value.length > 72) return { message: "Use 72 characters or fewer." };
  if (value === currentPassword) {
    return { message: "Choose a password different from your current one." };
  }
  return undefined;
}

export function ChangePasswordSection() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setError(null);
    form.reset();
  }

  const form = useForm({
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
    onSubmit: async ({ value }) => {
      setError(null);
      const result = await changePassword({
        currentPassword: value.currentPassword,
        newPassword: value.newPassword,
      });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      toast("Password updated");
      setOpen(false);
      reset();
    },
  });

  return (
    <section className="rounded-2xl border p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex max-w-sm flex-col gap-2">
          <h2 className="text-sm font-medium">Password</h2>
          <p className="text-muted-foreground text-sm">
            The password you sign in with. Changing it leaves you signed in here.
          </p>
        </div>

        <Dialog
          open={open}
          onOpenChange={(nextOpen) => {
            if (!nextOpen && form.state.isSubmitting) return;
            setOpen(nextOpen);
            if (!nextOpen) {
              reset();
            }
          }}
        >
          <DialogTrigger render={<Button variant="outline" size="sm" />}>
            Change password
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Change password</DialogTitle>
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
                name="currentPassword"
                validators={{
                  onChange: ({ value }) =>
                    value ? undefined : { message: "Enter your current password." },
                }}
                children={(field) => {
                  const isInvalid =
                    field.state.meta.isTouched && !field.state.meta.isValid;
                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor={field.name}>Current password</FieldLabel>
                      <PasswordInput
                        id={field.name}
                        name={field.name}
                        value={field.state.value}
                        onChange={field.handleChange}
                        onBlur={field.handleBlur}
                        invalid={isInvalid}
                        autoComplete="current-password"
                      />
                      {isInvalid && <FieldError errors={field.state.meta.errors} />}
                    </Field>
                  );
                }}
              />

              <form.Field
                name="newPassword"
                validators={{
                  onChange: ({ value, fieldApi }) =>
                    newPasswordError(value, fieldApi.form.state.values.currentPassword),
                }}
                children={(field) => {
                  const isInvalid =
                    field.state.meta.isTouched && !field.state.meta.isValid;
                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor={field.name}>New password</FieldLabel>
                      <PasswordInput
                        id={field.name}
                        name={field.name}
                        value={field.state.value}
                        onChange={field.handleChange}
                        onBlur={field.handleBlur}
                        invalid={isInvalid}
                        autoComplete="new-password"
                      />
                      {isInvalid ? (
                        <FieldError errors={field.state.meta.errors} />
                      ) : (
                        <FieldDescription>At least 8 characters.</FieldDescription>
                      )}
                    </Field>
                  );
                }}
              />

              <form.Field
                name="confirmPassword"
                validators={{
                  onChange: ({ value, fieldApi }) => {
                    if (!value) return { message: "Confirm your new password." };
                    if (value !== fieldApi.form.state.values.newPassword) {
                      return { message: "Passwords do not match." };
                    }
                    return undefined;
                  },
                  onChangeListenTo: ["newPassword"],
                }}
                children={(field) => {
                  const isInvalid =
                    field.state.meta.isTouched && !field.state.meta.isValid;
                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor={field.name}>Confirm new password</FieldLabel>
                      <PasswordInput
                        id={field.name}
                        name={field.name}
                        value={field.state.value}
                        onChange={field.handleChange}
                        onBlur={field.handleBlur}
                        invalid={isInvalid}
                        autoComplete="new-password"
                      />
                      {isInvalid && <FieldError errors={field.state.meta.errors} />}
                    </Field>
                  );
                }}
              />

              {error && <FieldError>{error}</FieldError>}

              <form.Subscribe
                selector={(state) => ({
                  valid: state.isValid,
                  submitting: state.isSubmitting,
                })}
              >
                {({ valid, submitting }) => (
                  <DialogFooter>
                    <Button type="submit" size="sm" disabled={submitting || !valid}>
                      {submitting && <Spinner />}
                      Save
                    </Button>
                  </DialogFooter>
                )}
              </form.Subscribe>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </section>
  );
}

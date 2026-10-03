"use client";

import { useState } from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useForm } from "@tanstack/react-form";
import * as z from "zod";

import { createProfile } from "@/app/actions/profiles";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

// The same shape and length the database checks, so the client rejects what the
// server would only reject after a round trip.
const onboardingSchema = z.object({
  username: z
    .string()
    .regex(
      /^[a-z0-9](?:[a-z0-9_-]{1,28}[a-z0-9])?$/,
      "Use lowercase letters, numbers, dashes, or underscores.",
    )
    .min(3, "Use at least 3 characters.")
    .max(30, "Use 30 characters or fewer."),
  displayName: z.string().max(80, "Use 80 characters or fewer."),
});

export function OnboardingForm() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: {
      username:
        typeof window === "undefined"
          ? ""
          : (sessionStorage.getItem("rinku:claim") ?? ""),
      displayName: "",
    },
    validators: { onSubmit: onboardingSchema },
    onSubmit: async ({ value }) => {
      setFormError(null);

      const result = await createProfile({
        username: value.username,
        displayName: value.displayName || undefined,
      });

      if ("error" in result) {
        setFormError(result.error);
        return;
      }

      sessionStorage.removeItem("rinku:claim");

      // SAFETY: the destination is /:username/overview for the profile just
      // created; the typed route union is only knowable for literals.
      router.push(`/${result.username}/overview` as Route);
      router.refresh();
    },
  });

  return (
    <Card className="w-full sm:max-w-sm">
      <CardHeader>
        <CardTitle>Create your profile</CardTitle>
        <CardDescription>
          Pick the address your page lives at. You can rename it later.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            form.handleSubmit();
          }}
        >
          <FieldGroup>
            {formError && <FieldError>{formError}</FieldError>}

            <form.Field
              name="username"
              children={(field) => {
                const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>Username</FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(event) => field.handleChange(event.target.value)}
                      aria-invalid={isInvalid}
                      autoComplete="off"
                      placeholder="your-name"
                    />
                    {isInvalid && <FieldError errors={field.state.meta.errors} />}
                  </Field>
                );
              }}
            />

            <form.Field
              name="displayName"
              children={(field) => {
                const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>Display name</FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(event) => field.handleChange(event.target.value)}
                      aria-invalid={isInvalid}
                      autoComplete="nickname"
                      placeholder="Your Name"
                    />
                    {isInvalid && <FieldError errors={field.state.meta.errors} />}
                  </Field>
                );
              }}
            />

            <Button type="submit" className="w-full" disabled={form.state.isSubmitting}>
              {form.state.isSubmitting && <Spinner />}
              Create profile
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}

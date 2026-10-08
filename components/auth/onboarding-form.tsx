"use client";

import { useEffect, useState } from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { CheckIcon } from "@phosphor-icons/react";
import { useForm } from "@tanstack/react-form";
import * as z from "zod";

import { checkUsernameAvailability, createProfile } from "@/app/actions/profiles";
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
import { usernameSchema } from "@/lib/profiles";

const onboardingSchema = z.object({
  username: usernameSchema,
  displayName: z.string().max(80, "Use 80 characters or fewer."),
});

function claimedUsername(): string {
  // The claim arrives as ?username= on signup. Page addresses are lowercase
  // only, so normalize once at the door.
  return (sessionStorage.getItem("rinku:claim") ?? "").trim().toLowerCase();
}

export function OnboardingForm() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [checkedValue, setCheckedValue] = useState("");

  const form = useForm({
    defaultValues: {
      username: typeof window === "undefined" ? "" : claimedUsername(),
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

  // A claim carried over from signup lands prefilled but unchecked. Run the
  // availability pass once on mount so a taken handle fails on arrival
  // instead of on submit.
  useEffect(() => {
    if (claimedUsername() === "") {
      return;
    }
    void form.validateField("username", "change");
  }, [form]);

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
              validators={{
                onChange: usernameSchema,
                onChangeAsyncDebounceMs: 400,
                onChangeAsync: async ({ value }) => {
                  const candidate = value.trim().toLowerCase();
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
                const candidate = field.state.value.trim().toLowerCase();
                const isAvailable =
                  !checking &&
                  candidate !== "" &&
                  candidate === checkedValue &&
                  field.state.meta.isValid;
                // Errors render even untouched: the mount check can attach a
                // "taken" verdict before the user has typed anything.
                const isInvalid = field.state.meta.errors.length > 0;
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>Username</FieldLabel>
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
                        placeholder="your-name"
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

            <form.Subscribe
              selector={(state) => ({
                can: !state.isValidating && state.isValid,
                submitting: state.isSubmitting,
                username: state.values.username,
              })}
            >
              {({ can, submitting, username }) => {
                const candidate = username.trim().toLowerCase();
                return (
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={
                      submitting || checking || !can || candidate !== checkedValue
                    }
                  >
                    {submitting && <Spinner />}
                    Create profile
                  </Button>
                );
              }}
            </form.Subscribe>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}

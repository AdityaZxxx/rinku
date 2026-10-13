"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useForm } from "@tanstack/react-form";
import * as z from "zod";

import { focusFirstInvalidField } from "@/components/auth/focus-first-invalid";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { log } from "@/lib/log";
import { createClient } from "@/lib/supabase/client";

const resetSchema = z.object({
  email: z.email("Enter a valid email address."),
});

export function ForgotPasswordForm() {
  const [formError, setFormError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const confirmationHeadingRef = useRef<HTMLHeadingElement>(null);

  const form = useForm({
    defaultValues: { email: "" },
    validators: { onSubmit: resetSchema },
    onSubmitInvalid: ({ formApi }) => {
      focusFirstInvalidField(formApi, ["email"]);
    },
    onSubmit: async ({ value }) => {
      setFormError(null);

      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(value.email, {
        // The recovery link signs the user in; `next` lands them where the new password is set.
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(
          "/account/settings",
        )}`,
      });

      if (error) {
        log.error("auth", "resetPasswordForEmail failed", error.message);
        // Generic on purpose: a specific error would reveal which emails have accounts.
        setFormError("Unable to send the reset email. Try again in a moment.");
        return;
      }

      setSentTo(value.email);
    },
  });

  // The card swap is otherwise silent, so focus moves to its heading for screen readers.
  useEffect(() => {
    if (sentTo) {
      confirmationHeadingRef.current?.focus();
    }
  }, [sentTo]);

  if (sentTo) {
    return (
      <Card className="w-full sm:max-w-sm">
        <CardHeader>
          <h1
            ref={confirmationHeadingRef}
            tabIndex={-1}
            className="font-heading text-base font-medium"
          >
            Check your email
          </h1>
          <CardDescription className="break-words">
            If an account exists for {sentTo}, a reset link is on its way. Open it to set
            a new password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            className="w-full"
            nativeButton={false}
            render={<Link href="/login" />}
          >
            Back to sign in
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full sm:max-w-sm">
      <CardHeader>
        <h1 className="font-heading text-base font-medium">Reset password</h1>
        <CardDescription>
          Enter your email and we will send a link to set a new password.
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
              name="email"
              children={(field) => {
                const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>Email</FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      type="email"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(event) => field.handleChange(event.target.value)}
                      aria-invalid={isInvalid}
                      aria-describedby={isInvalid ? `${field.name}-error` : undefined}
                      autoComplete="email"
                      placeholder="you@example.com"
                    />
                    {isInvalid && (
                      <FieldError
                        id={`${field.name}-error`}
                        errors={field.state.meta.errors}
                      />
                    )}
                  </Field>
                );
              }}
            />

            <Button type="submit" className="w-full" disabled={form.state.isSubmitting}>
              {form.state.isSubmitting && <Spinner />}
              Send reset link
            </Button>
          </FieldGroup>
        </form>
      </CardContent>

      <CardFooter className="justify-center">
        <p className="text-muted-foreground text-sm">
          Remembered your password?{" "}
          <Link href="/login" className="underline underline-offset-4">
            Sign in
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}

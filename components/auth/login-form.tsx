"use client";

import { useState } from "react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "@tanstack/react-form";
import * as z from "zod";

import { GoogleButton } from "@/components/auth/google-button";
import { PasswordInput } from "@/components/auth/password-input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { log } from "@/lib/log";
import { createClient } from "@/lib/supabase/client";

const loginSchema = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});

export function LoginForm({ next, oauthError }: { next: Route; oauthError?: string }) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: { email: "", password: "" },
    validators: { onSubmit: loginSchema },
    onSubmit: async ({ value }) => {
      setFormError(null);

      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword(value);

      if (error) {
        log.error("auth", "signInWithPassword failed", error.message);
        // Wrong credentials and unknown email get one message on purpose, so
        // this must not imply which one it was.
        setFormError("Unable to sign in. Check your email and password, then try again.");
        return;
      }

      router.push(next);
      router.refresh();
    },
  });

  return (
    <Card className="w-full sm:max-w-sm">
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>Manage your links and see who clicks them.</CardDescription>
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
            {oauthError && <FieldError>{oauthError}</FieldError>}
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
                      autoComplete="email"
                      placeholder="you@example.com"
                    />
                    {isInvalid && <FieldError errors={field.state.meta.errors} />}
                  </Field>
                );
              }}
            />

            <form.Field
              name="password"
              children={(field) => {
                const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>Password</FieldLabel>
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

            <Button type="submit" className="w-full" disabled={form.state.isSubmitting}>
              {form.state.isSubmitting && <Spinner />}
              Sign in
            </Button>

            <GoogleButton disabled={form.state.isSubmitting} />

            <p className="text-muted-foreground text-center text-sm">
              By continuing, you agree to the{" "}
              <Link href="/terms" className="underline underline-offset-4">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="underline underline-offset-4">
                Privacy Policy
              </Link>
              .
            </p>
          </FieldGroup>
        </form>
      </CardContent>

      <CardFooter className="justify-center">
        <p className="text-muted-foreground text-sm">
          New to Rinku?{" "}
          <Link href="/signup" className="underline underline-offset-4">
            Create an account
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}

"use client";

import { useState } from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

export function ClaimUsernameForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="flex w-full max-w-lg flex-col gap-1"
      onSubmit={(event) => {
        event.preventDefault();
        const trimmed = username.trim().toLowerCase();
        if (
          !/^[a-z0-9](?:[a-z0-9_-]{1,28}[a-z0-9])?$/.test(trimmed) ||
          trimmed.length < 3
        ) {
          setError("Use 3–30 lowercase letters, numbers, dashes, or underscores.");
          return;
        }
        setError(null);
        // SAFETY: username is validated before navigation, and the query value
        // is encoded, so the route stays within the typed-routes union.
        router.push(`/signup?username=${encodeURIComponent(trimmed)}` as Route);
      }}
    >
      <div className="flex w-full flex-col gap-3 sm:flex-row">
        <label className="border-input bg-background focus-within:border-ring focus-within:ring-ring/50 dark:bg-input/30 flex h-11 w-full items-center gap-0 overflow-hidden rounded-2xl border px-3 text-sm focus-within:ring-[3px] sm:flex-1">
          <span className="text-muted-foreground shrink-0">rinku.app/</span>
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="yourname"
            aria-label="Choose a username"
            autoComplete="username"
            className="placeholder:text-muted-foreground min-w-0 flex-1 bg-transparent outline-none"
          />
        </label>
        <Button size="lg" type="submit" className="h-11 w-full sm:w-auto">
          Get started
        </Button>
      </div>
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
    </form>
  );
}

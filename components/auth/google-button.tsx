"use client";

import { useState } from "react";
import { GoogleLogoIcon } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { log } from "@/lib/log";
import { createClient } from "@/lib/supabase/client";

export function GoogleButton({ disabled }: { disabled?: boolean }) {
  const [pending, setPending] = useState(false);

  async function signInWithGoogle() {
    setPending(true);

    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback`;
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });

    if (error) {
      log.error("auth", "signInWithOAuth failed", error.message);
      setPending(false);
      return;
    }

    if (data.url) {
      window.location.assign(data.url);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full"
      onClick={signInWithGoogle}
      disabled={disabled || pending}
    >
      {pending ? <Spinner /> : <GoogleLogoIcon weight="bold" />}
      Continue with Google
    </Button>
  );
}

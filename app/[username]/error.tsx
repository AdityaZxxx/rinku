"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { log } from "@/lib/log";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    log.error("public", "Public page error boundary caught", error.message);
  }, [error]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <h2 className="text-lg font-semibold">This page could not be loaded</h2>
      <p className="text-muted-foreground max-w-md text-sm">
        An unexpected error occurred. Trying again usually fixes it.
      </p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}

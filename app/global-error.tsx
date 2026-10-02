"use client";

import { useEffect } from "react";

import { log } from "@/lib/log";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    log.error("app", "Global error boundary caught", error.message);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: "2rem" }}>
        <h2>Something went wrong</h2>
        <p>An unexpected error occurred.</p>
        <button onClick={reset}>Try again</button>
      </body>
    </html>
  );
}

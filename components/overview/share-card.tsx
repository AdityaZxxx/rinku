"use client";

import { useState, useSyncExternalStore } from "react";
import { CheckIcon, ConfettiIcon, CopyIcon, XIcon } from "@phosphor-icons/react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { copyText } from "@/lib/copy";
import { displayUrl } from "@/lib/links/model";

// localStorage is the store for share-card dismissal; these listeners let a
// dismiss in one mounted card re-render it (and any siblings) at once.
const dismissalListeners = new Set<() => void>();

function subscribeDismissed(onStoreChange: () => void) {
  dismissalListeners.add(onStoreChange);
  return () => {
    dismissalListeners.delete(onStoreChange);
  };
}

function readDismissed(storageKey: string) {
  try {
    return window.localStorage.getItem(storageKey) === "1";
  } catch {
    // Storage can be unavailable (private mode); persistence is best-effort.
    return false;
  }
}

/**
 * The moment every setup item is done, the checklist hands off to this: the
 * page exists, now put it in front of people. Dismissal is remembered per
 * profile in localStorage.
 */
export function ShareCard({
  profileId,
  username,
  url,
}: {
  profileId: string;
  username: string;
  url: string;
}) {
  const storageKey = `rinku:share-card-dismissed:${profileId}`;
  // The server cannot know the client's storage; "not dismissed" is its
  // stable snapshot so hydration corrects rather than mismatches (see
  // use-is-mac).
  const dismissed = useSyncExternalStore(
    subscribeDismissed,
    () => readDismissed(storageKey),
    () => false,
  );
  const [copied, setCopied] = useState(false);

  if (dismissed) {
    return null;
  }

  async function copy() {
    if (!(await copyText(url))) {
      toast.error("Couldn't copy the link");
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
    toast.success("Link copied to clipboard");
  }

  function onDismiss() {
    try {
      window.localStorage.setItem(storageKey, "1");
    } catch {
      // Best-effort: without storage the dismissal lasts until navigation.
    }
    for (const listener of dismissalListeners) {
      listener();
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-medium">
          <ConfettiIcon className="size-4" />
          Your page is ready to share
        </h2>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onDismiss}
          aria-label="Dismiss share card"
        >
          <XIcon />
        </Button>
      </div>
      <p className="text-muted-foreground text-sm">
        Everything is set up. Put your link wherever people find you.
      </p>
      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={copy}
          aria-label={copied ? "Copied" : `Copy ${url} to clipboard`}
          title={copied ? "Copied" : "Copy link"}
          className="border-input hover:bg-accent focus-visible:ring-ring/30 flex min-w-0 items-center justify-between gap-3 rounded-full border px-4 py-2 text-sm transition-colors focus-visible:ring-3 focus-visible:outline-none sm:flex-1"
        >
          <span className="truncate">{displayUrl(url)}</span>
          {copied ? (
            <CheckIcon className="size-4 shrink-0" />
          ) : (
            <CopyIcon className="size-4 shrink-0" />
          )}
        </button>
        <figure className="flex flex-col items-center gap-1 self-center sm:self-auto">
          {/* eslint-disable-next-line @next/next/no-img-element -- same-host immutable SVG; the optimizer adds nothing to a route we control */}
          <img
            src={`/api/qr/${username}`}
            alt={`QR code linking to ${url}`}
            className="size-24 rounded-lg border"
          />
          <figcaption className="text-muted-foreground text-xs">Scan to open</figcaption>
        </figure>
      </div>
    </div>
  );
}

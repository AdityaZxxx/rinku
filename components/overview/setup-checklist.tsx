"use client";

import { useSyncExternalStore } from "react";
import type { Route } from "next";
import Link from "next/link";
import { CheckIcon, XIcon } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";

// Plain `Route` covers only static routes; dynamic ones must be parameterized
// with their shape for the generated route types to accept them.
type ChecklistHref = Route<`/${string}/links` | `/${string}/profile`>;

// localStorage is the store for checklist dismissal; these listeners let a
// dismiss in one mounted checklist re-render it (and any siblings) at once.
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
 * Getting-started checklist on the per-profile overview. Each unfinished item
 * deep links to the page that completes it. Dismissal is remembered per
 * profile in localStorage, and the checklist hides itself once everything is
 * done.
 */
export function SetupChecklist({
  profileId,
  username,
  hasLiveLink,
  hasAvatar,
  hasBanner,
  hasBio,
}: {
  profileId: string;
  username: string;
  hasLiveLink: boolean;
  hasAvatar: boolean;
  hasBanner: boolean;
  hasBio: boolean;
}) {
  const storageKey = `rinku:checklist-dismissed:${profileId}`;
  // The server cannot know the client's storage; "not dismissed" is its stable
  // snapshot so hydration corrects rather than mismatches (see use-is-mac).
  const dismissed = useSyncExternalStore(
    subscribeDismissed,
    () => readDismissed(storageKey),
    () => false,
  );

  const items: { done: boolean; label: string; href: ChecklistHref }[] = [
    {
      done: hasLiveLink,
      label: "Add your first link",
      href: `/${username}/links`,
    },
    { done: hasAvatar, label: "Add an avatar", href: `/${username}/profile` },
    { done: hasBanner, label: "Add a banner", href: `/${username}/profile` },
    { done: hasBio, label: "Write a bio", href: `/${username}/profile` },
  ];
  const doneCount = items.filter((item) => item.done).length;

  if (dismissed || doneCount === items.length) {
    return null;
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
        <h2 className="text-sm font-medium">
          Getting started · {doneCount} of {items.length} done
        </h2>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onDismiss}
          aria-label="Dismiss checklist"
        >
          <XIcon />
        </Button>
      </div>

      <div
        // eslint-disable-next-line jsx-a11y/prefer-tag-over-role -- custom thin bar: a native progress element can't be styled to match across browsers
        role="progressbar"
        aria-valuenow={doneCount}
        aria-valuemin={0}
        aria-valuemax={items.length}
        className="bg-muted h-1.5 w-full overflow-hidden rounded-full"
      >
        <div
          className="bg-foreground h-full rounded-full transition-[width]"
          style={{ width: `${(doneCount / items.length) * 100}%` }}
        />
      </div>

      <ul className="flex flex-col gap-1">
        {items.map((item) => (
          <li key={item.label} className="flex items-center gap-3 text-sm">
            <span
              aria-hidden
              className={`flex size-4 shrink-0 items-center justify-center rounded-full border ${
                item.done
                  ? "bg-foreground border-transparent"
                  : "border-muted-foreground/40"
              }`}
            >
              {item.done ? (
                <CheckIcon className="text-background size-2.5" weight="bold" />
              ) : null}
            </span>
            {item.done ? (
              <span className="text-muted-foreground line-through">{item.label}</span>
            ) : (
              <Link href={item.href} className="underline-offset-4 hover:underline">
                {item.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

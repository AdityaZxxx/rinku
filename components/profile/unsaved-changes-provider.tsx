"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useEditorDirty } from "./unsaved-guard";

/**
 * Confirms leaving an editor with unpublished edits, using the app's styled
 * alert dialog instead of `window.confirm`.
 *
 * Two constraints shape this:
 * - `Link.onNavigate` is synchronous and must `preventDefault()` immediately,
 *   while a dialog resolves later. So a guarded link cancels the navigation,
 *   then re-issues it with `router.push` only if the user confirms.
 * - The navigation event carries no destination, so the link has to supply its
 *   own `href`; that is why guarding is a `GuardedLink` component rather than a
 *   bare handler.
 */
const UnsavedChangesContext = createContext<{
  confirmLeave: (run: () => void) => void;
} | null>(null);

/** Runs `run` at once when clean, or after confirmation when edits are pending. */
export function useConfirmLeave() {
  const context = useContext(UnsavedChangesContext);
  return context?.confirmLeave ?? ((run: () => void) => run());
}

export function UnsavedChangesProvider({ children }: { children: ReactNode }) {
  const dirty = useEditorDirty();
  const [open, setOpen] = useState(false);
  const pending = useRef<(() => void) | null>(null);

  const confirmLeave = useCallback(
    (run: () => void) => {
      if (!dirty) {
        run();
        return;
      }
      pending.current = run;
      setOpen(true);
    },
    [dirty],
  );

  function onConfirm() {
    const run = pending.current;
    pending.current = null;
    setOpen(false);
    run?.();
  }

  const value = useMemo(() => ({ confirmLeave }), [confirmLeave]);

  return (
    <UnsavedChangesContext.Provider value={value}>
      {children}
      <AlertDialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) {
            pending.current = null;
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unpublished changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have changes that haven&apos;t been published yet. If you leave now,
              they&apos;ll be discarded.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Stay</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={onConfirm}>
              Discard and leave
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </UnsavedChangesContext.Provider>
  );
}

/**
 * A `next/link` that asks before navigating away from unpublished edits. Use it
 * in place of `Link` anywhere a navigation could abandon an editor.
 *
 * `href` is a typed route (every caller passes one) so the confirmed
 * re-navigation can go through `router.push`.
 */
export function GuardedLink({
  href,
  ...props
}: {
  href: Route;
} & Omit<ComponentProps<typeof Link>, "href" | "onNavigate">) {
  const confirmLeave = useConfirmLeave();
  const dirty = useEditorDirty();
  const router = useRouter();

  return (
    <Link
      href={href}
      {...props}
      onNavigate={(event) => {
        if (!dirty) {
          return;
        }
        // Cancel the in-flight navigation, then re-run it only if confirmed.
        event.preventDefault();
        confirmLeave(() => router.push(href));
      }}
    />
  );
}

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
import { FloppyDiskIcon, PencilSimpleIcon, TrashIcon } from "@phosphor-icons/react";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import { useIsMobile } from "@/hooks/use-mobile";
import { getUnsavedActions, useEditorDirty, type UnsavedActions } from "./unsaved-guard";

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
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [actions, setActions] = useState<UnsavedActions | null>(null);
  const [saving, setSaving] = useState(false);
  const pending = useRef<(() => void) | null>(null);

  const confirmLeave = useCallback(
    (run: () => void) => {
      if (!dirty) {
        run();
        return;
      }
      pending.current = run;
      setActions(getUnsavedActions());
      setOpen(true);
    },
    [dirty],
  );

  function finishLeave() {
    const run = pending.current;
    pending.current = null;
    setOpen(false);
    run?.();
  }

  function onLeave(kind: "save" | "discard") {
    if (kind === "discard") {
      // Optimistic: the visitor is leaving either way, so navigation starts
      // at once and the row delete lands in the background. A failure toasts
      // on the next page, and the draft resurfaces on the next visit.
      actions?.discard().catch(() => {});
      finishLeave();
      return;
    }
    setSaving(true);
    actions
      ?.save()
      .then(finishLeave)
      .catch(() => {
        // The failed mutation already toasted; keep the confirm open to retry.
      })
      .finally(() => setSaving(false));
  }

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      pending.current = null;
    }
  }

  const value = useMemo(() => ({ confirmLeave }), [confirmLeave]);

  return (
    <UnsavedChangesContext.Provider value={value}>
      {children}
      {isMobile ? (
        <Sheet open={open} onOpenChange={onOpenChange}>
          <SheetContent side="bottom" className="rounded-t-3xl px-4 pt-4 pb-5">
            <SheetTitle className="text-center text-base">Unpublished changes</SheetTitle>
            <SheetDescription className="text-muted-foreground mt-0.5 text-center text-sm">
              Save to take them live, discard them, or keep editing.
            </SheetDescription>
            <div className="mt-3 flex flex-col gap-2">
              {actions?.save ? (
                <button
                  type="button"
                  onClick={() => onLeave("save")}
                  className="border-input hover:bg-accent focus-visible:ring-ring/30 flex w-full items-center justify-center gap-2 rounded-2xl border px-3 py-2.5 text-sm transition-colors focus-visible:ring-3 focus-visible:outline-none active:translate-y-px"
                >
                  {saving ? (
                    <Spinner className="size-4 shrink-0" />
                  ) : (
                    <FloppyDiskIcon className="text-muted-foreground size-4 shrink-0" />
                  )}
                  Save and leave
                </button>
              ) : null}
              {actions?.discard ? (
                <button
                  type="button"
                  onClick={() => onLeave("discard")}
                  className="border-input hover:bg-accent focus-visible:ring-ring/30 text-destructive flex w-full items-center justify-center gap-2 rounded-2xl border px-3 py-2.5 text-sm transition-colors focus-visible:ring-3 focus-visible:outline-none active:translate-y-px"
                >
                  <TrashIcon className="size-4 shrink-0" />
                  Discard and leave
                </button>
              ) : null}
              <SheetClose
                render={
                  <button
                    type="button"
                    aria-label="Keep editing"
                    className="border-input hover:bg-accent focus-visible:ring-ring/30 text-muted-foreground flex w-full items-center justify-center gap-2 rounded-2xl border px-3 py-2.5 text-sm transition-colors focus-visible:ring-3 focus-visible:outline-none active:translate-y-px"
                  />
                }
              >
                <PencilSimpleIcon className="size-4 shrink-0" />
                Keep editing
              </SheetClose>
            </div>
          </SheetContent>
        </Sheet>
      ) : (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Unpublished changes</AlertDialogTitle>
              <AlertDialogDescription>
                You have changes that haven&apos;t been published yet. If you leave now,
                they&apos;ll be discarded.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep editing</AlertDialogCancel>
              {actions?.discard ? (
                <Button variant="destructive" onClick={() => onLeave("discard")}>
                  Discard and leave
                </Button>
              ) : null}
              {actions?.save ? (
                <Button disabled={saving} onClick={() => onLeave("save")}>
                  {saving ? <Spinner /> : null}
                  Save and leave
                </Button>
              ) : null}
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
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

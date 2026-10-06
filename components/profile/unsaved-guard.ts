"use client";

import { useEffect, useSyncExternalStore } from "react";

/**
 * A single, tab-wide "there are unpublished edits" flag. A module store rather
 * than React context because the two sides live in different trees: the editor
 * sets it, the sidebar and profile picker read it. It is per-tab by nature and
 * resets on reload, which matches the session-only history.
 */
let dirty = false;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return dirty;
}

/** The server has no unsaved edits; a stable `false` avoids a hydration split. */
function getServerSnapshot() {
  return false;
}

export function setEditorDirty(next: boolean) {
  if (dirty === next) {
    return;
  }
  dirty = next;
  for (const listener of listeners) {
    listener();
  }
}

export function useEditorDirty() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/**
 * Native confirm for a reload or tab close. Mount once per editor route; it
 * only attaches a listener while edits are actually pending. This is the one
 * path that cannot use the styled dialog: browsers do not let a page draw
 * custom UI during unload.
 */
export function useUnsavedChangesWarning() {
  const isDirty = useEditorDirty();
  useEffect(() => {
    if (!isDirty) {
      return;
    }
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      // Legacy browsers require a truthy returnValue to show the prompt.
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);
}

"use client";

import { useCallback, useRef, useState } from "react";

/**
 * A bounded, session-only undo/redo stack over a JSON-serializable state.
 *
 * Edits coalesce by `key`: consecutive pushes sharing a key (the same field
 * being typed into, the same color being dragged) collapse into one history
 * entry, so a burst of keystrokes undoes as a single step. A push with no key
 * always starts a new entry.
 *
 * `undo`/`redo` return the value to re-apply (or `undefined` when the stack is
 * empty). They are synchronous: the stacks live in refs, so a drag firing many
 * `push`es per frame cannot race a stale closure. A small state mirror carries
 * the render-visible slice (`present`, `canUndo`, `canRedo`).
 */
export function useUndoRedo<T>(initial: T, limit = 100) {
  const present = useRef(initial);
  const past = useRef<T[]>([]);
  const future = useRef<T[]>([]);
  // The coalescing key of the change currently on top of `past`, if any.
  const openKey = useRef<string | null>(null);
  const [snapshot, setSnapshot] = useState({
    present: initial,
    canUndo: false,
    canRedo: false,
  });

  const sync = useCallback(() => {
    setSnapshot({
      present: present.current,
      canUndo: past.current.length > 0,
      canRedo: future.current.length > 0,
    });
  }, []);

  const push = useCallback(
    (next: T, key?: string) => {
      const coalesce =
        key !== undefined && key === openKey.current && past.current.length > 0;
      if (!coalesce) {
        if (past.current.length >= limit) {
          past.current = past.current.slice(1);
        }
        past.current = [...past.current, present.current];
      }
      openKey.current = key ?? null;
      future.current = [];
      present.current = next;
      sync();
    },
    [limit, sync],
  );

  /** Clears history and restarts from `next`, e.g. after publishing. */
  const reset = useCallback(
    (next: T) => {
      past.current = [];
      future.current = [];
      openKey.current = null;
      present.current = next;
      sync();
    },
    [sync],
  );

  const undo = useCallback((): T | undefined => {
    if (past.current.length === 0) {
      return undefined;
    }
    // SAFETY: only read after the length guard above, so the index is in range.
    const previous = past.current[past.current.length - 1] as T;
    past.current = past.current.slice(0, -1);
    future.current = [...future.current, present.current];
    openKey.current = null;
    present.current = previous;
    sync();
    return previous;
  }, [sync]);

  const redo = useCallback((): T | undefined => {
    if (future.current.length === 0) {
      return undefined;
    }
    // SAFETY: only read after the length guard above, so the index is in range.
    const next = future.current[future.current.length - 1] as T;
    future.current = future.current.slice(0, -1);
    past.current = [...past.current, present.current];
    openKey.current = null;
    present.current = next;
    sync();
    return next;
  }, [sync]);

  return {
    present: snapshot.present,
    push,
    reset,
    undo,
    redo,
    canUndo: snapshot.canUndo,
    canRedo: snapshot.canRedo,
  };
}

"use client";

import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";
import type { Appearance } from "@/lib/profiles/appearance";

/**
 * The hover-scrub channel: while a picker tile is pointed at, the editor
 * publishes a transient appearance here, and only the device previews
 * subscribe. Keeping this out of the profile query cache and the draft
 * context means a scrub re-renders the preview alone, never the editor form
 * or the rest of the dashboard, however heavy the themed page is.
 *
 * Two contexts so the setter stays referentially stable: the editor reads
 * only the setter, so publishing a scrub never re-renders the editor either.
 */
const AppearanceScrubSetterContext = createContext<(next: Appearance | null) => void>(
  () => {},
);
const AppearanceScrubContext = createContext<Appearance | null>(null);

export function AppearanceScrubProvider({ children }: { children: ReactNode }) {
  const [scrub, setScrub] = useState<Appearance | null>(null);
  return (
    <AppearanceScrubSetterContext.Provider value={setScrub}>
      <AppearanceScrubContext.Provider value={scrub}>
        {children}
      </AppearanceScrubContext.Provider>
    </AppearanceScrubSetterContext.Provider>
  );
}

export function useSetAppearanceScrub() {
  return useContext(AppearanceScrubSetterContext);
}

/** The scrubbed appearance, or null when no picker tile is being previewed. */
export function useAppearanceScrub() {
  return useContext(AppearanceScrubContext);
}

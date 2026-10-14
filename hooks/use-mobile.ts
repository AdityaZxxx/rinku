import * as React from "react";

// The app's one mobile boundary: below lg the mobile chrome takes over — the
// dock, sheets, and single-column editors. JS branches use this hook and CSS
// uses lg: classes; keep the two in agreement when touching either.
const MOBILE_BREAKPOINT = 1024;
const QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`;

function subscribe(callback: () => void) {
  const mql = window.matchMedia(QUERY);
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

export function useIsMobile() {
  return React.useSyncExternalStore(
    subscribe,
    () => window.innerWidth < MOBILE_BREAKPOINT,
    () => false,
  );
}

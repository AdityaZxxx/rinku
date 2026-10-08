"use client";

import { useSyncExternalStore } from "react";

function subscribe() {
  return () => {};
}

function getSnapshot() {
  return navigator.userAgent.includes("Mac");
}

/**
 * The server cannot sniff a platform; "true" is the server render's stable
 * default so hydration corrects it rather than mismatches on it.
 */
function getServerSnapshot() {
  return true;
}

export function useIsMac() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

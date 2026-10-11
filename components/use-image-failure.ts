"use client";

import { useState, type SyntheticEvent } from "react";

type FaviconState = "show" | "placeholder" | "broken";

// Google's placeholder globe for logo-less domains is a fixed 16x16, while
// real logos come back at 48x48 or larger (sz=64), so width is the only
// signal the page can read: the 404 that rides along has a valid PNG body.
const FALLBACK_MAX_WIDTH = 16;

/**
 * Which outcome a favicon URL resolved to: a real logo, the renderer's 16x16
 * placeholder (rows swap it for their own globe), or a failed load. Keyed by
 * URL, so a replaced favicon is judged on its own.
 */
export function useFaviconImage(
  url: string | null,
): [
  state: FaviconState,
  onLoad: (event: SyntheticEvent<HTMLImageElement>) => void,
  onError: () => void,
  imageRef: (node: HTMLImageElement | null) => void,
] {
  const [classified, setClassified] = useState<{
    url: string;
    state: FaviconState;
  } | null>(null);
  const state: FaviconState =
    classified !== null && classified.url === (url ?? "") ? classified.state : "show";

  const settle = (width: number) => {
    const next: FaviconState =
      width === 0 ? "broken" : width <= FALLBACK_MAX_WIDTH ? "placeholder" : "show";
    setClassified((previous) =>
      previous !== null && previous.url === (url ?? "") && previous.state === next
        ? previous
        : { url: url ?? "", state: next },
    );
  };

  // Both sides of the race: a load that lands after React attached its
  // handlers, and one already finished by the time the ref runs.
  const onLoad = (event: SyntheticEvent<HTMLImageElement>) =>
    settle(event.currentTarget.naturalWidth);
  const onError = () => settle(0);
  const imageRef = (node: HTMLImageElement | null) => {
    if (node !== null && node.complete) {
      settle(node.naturalWidth);
    }
  };

  return [state, onLoad, onError, imageRef];
}

/**
 * Failure state for one `<img>`, covering both halves of the race: an error
 * that lands after React attached its handler (the `onError` path), and one
 * that lands before hydration, when the element is already finished with no
 * intrinsic size by the time a ref could look at it. The second case is real
 * for a route that 404s fast, like the gated-thumb derivative.
 */
export function useImageFailure(): [
  failed: boolean,
  onFailed: () => void,
  failedRef: (node: HTMLImageElement | null) => void,
] {
  const [failed, setFailed] = useState(false);
  const onFailed = () => setFailed(true);
  const failedRef = (node: HTMLImageElement | null) => {
    if (node?.complete && node.naturalWidth === 0) {
      setFailed(true);
    }
  };
  return [failed, onFailed, failedRef];
}

/**
 * The same failure state keyed to one src, so a thumbnail that 404'd once
 * shows again once the row points at a working URL: the state remembers the
 * failed URL rather than a boolean.
 */
export function useSrcImageFailure(
  src: string | null | undefined,
): [
  broken: boolean,
  onFailed: () => void,
  failedRef: (node: HTMLImageElement | null) => void,
] {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const broken = src != null && src !== "" && src === failedSrc;
  const onFailed = () => setFailedSrc(src ?? null);
  const failedRef = (node: HTMLImageElement | null) => {
    if (src && node?.complete && node.naturalWidth === 0) {
      setFailedSrc(src);
    }
  };
  return [broken, onFailed, failedRef];
}

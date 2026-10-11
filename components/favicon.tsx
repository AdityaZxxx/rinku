"use client";

import { GlobeSimpleIcon } from "@phosphor-icons/react";

import { useFaviconImage } from "./use-image-failure";

/**
 * A host favicon served by Google's renderer. Domains with no logo get its
 * 16x16 placeholder, which rows swap for their own globe; only a genuinely
 * failed load hides the favicon.
 */
export function Favicon({ url, className }: { url: string; className: string }) {
  const [state, onLoad, onError, imageRef] = useFaviconImage(url);
  if (state === "broken") {
    return null;
  }
  if (state === "placeholder") {
    return <GlobeSimpleIcon className={className} aria-hidden />;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- tiny cross-host favicon: next/image would proxy each host and the optimizer cache never earns its keep
    <img
      ref={imageRef}
      src={url}
      alt=""
      className={className}
      onLoad={onLoad}
      onError={onError}
    />
  );
}

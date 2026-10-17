"use client";

import type { ComponentType } from "react";
import * as Ph from "@phosphor-icons/react";

/**
 * The editor's synchronous view of the whole Phosphor catalogue, for the icon
 * picker. Reading the barrel as a namespace makes every icon a live
 * dependency, so this stays out of `components/media-icon.tsx`, which the
 * public page renders for every link and which lazy-loads picks instead.
 */
export const MEDIA_ICON_IDS: readonly string[] = Object.keys(Ph)
  .filter((name) => name.endsWith("Icon"))
  .map((name) => name.slice(0, -"Icon".length));

export function CatalogIcon({ id, className }: { id: string; className?: string }) {
  // SAFETY: the slice of the barrel we read is a component name, so the
  // module record is indexed by its own key space; misses render nothing.
  const key = `${id}Icon` as keyof typeof Ph;
  // eslint-disable-next-line import/namespace -- dynamic barrel key (id + "Icon")
  const Icon = Ph[key];
  // SAFETY: Icon is the module's component export, its props accept className.
  const Renderable = Icon as ComponentType<{ className?: string }> | undefined;
  return Renderable ? <Renderable className={className} /> : null;
}

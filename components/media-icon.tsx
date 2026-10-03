"use client";

import * as Ph from "@phosphor-icons/react";

export const MEDIA_ICON_IDS = Object.keys(Ph)
  .filter((name) => name.endsWith("Icon"))
  .map((name) => name.slice(0, -"Icon".length));

export function isIconMedia(imageUrl: string | null | undefined): boolean {
  return imageUrl != null && imageUrl.startsWith("icon:");
}

export function iconMediaId(imageUrl: string): string {
  return imageUrl.slice("icon:".length);
}

export function MediaIcon({
  imageUrl,
  className,
}: {
  imageUrl: string | null | undefined;
  className?: string;
}) {
  if (!isIconMedia(imageUrl) || imageUrl == null) return null;
  // SAFETY: the slice of the barrel we read is a component name, so the
  // module record is indexed by its own key space; misses render nothing.
  const key = `${iconMediaId(imageUrl)}Icon` as keyof typeof Ph;
  // eslint-disable-next-line import/namespace
  const Icon = Ph[key];
  if (!Icon) return null;
  // SAFETY: Icon is the module's component export, its props accept className.
  const Renderable = Icon as React.ComponentType<{ className?: string }>;
  return <Renderable className={className} />;
}

import * as z from "zod";

import { log } from "@/lib/log";

// An owner-controlled url renders on the public page for visitors, so the
// scheme allow-list keeps javascript: and data: out rather than trusting the
// renderer to escape.
const ALLOWED_SCHEMES = /^(?:https?|mailto|tel):/i;

const urlFormatSchema = z
  .url("Enter a valid URL.")
  .max(2048, "Use 2048 characters or fewer.");

export const linkUrlSchema = urlFormatSchema.refine(
  (value) => ALLOWED_SCHEMES.test(value),
  "Use an http(s), mailto, or tel link.",
);

export const httpUrlSchema = urlFormatSchema.refine(
  (value) => /^https?:\/\//i.test(value),
  "Use an http(s) URL.",
);

export const linkTitleSchema = z
  .string()
  .min(1, "Give the link a title.")
  .max(100, "Use 100 characters or fewer.");

export const linkVariantSchema = z.enum(["classic", "featured"]);

// Optional visibility window: null means no bound. The refine mirrors the
// links_visible_window check so the client rejects what the database would.
export const linkScheduleSchema = z
  .object({
    visibleFrom: z.coerce.date().nullable().optional(),
    visibleUntil: z.coerce.date().nullable().optional(),
  })
  .refine(
    (value) =>
      !value.visibleFrom ||
      !value.visibleUntil ||
      value.visibleFrom <= value.visibleUntil,
    "The start must be before the end.",
  );

export type ScheduleStatus = "live" | "scheduled" | "expired";

/** Where a row sits relative to now. Ignores isActive/archivedAt. */
export function scheduleStatus(
  link: { visibleFrom: Date | string | null; visibleUntil: Date | string | null },
  now: Date = new Date(),
): ScheduleStatus {
  const from = link.visibleFrom ? new Date(link.visibleFrom) : null;
  const until = link.visibleUntil ? new Date(link.visibleUntil) : null;
  if (from && !Number.isNaN(from.getTime()) && from > now) {
    return "scheduled";
  }
  if (until && !Number.isNaN(until.getTime()) && until <= now) {
    return "expired";
  }
  return "live";
}

// The same shape and lengths the database checks, so the client rejects what
// the server would only reject after a round trip.
export const linkInputSchema = z.object({
  title: linkTitleSchema,
  url: linkUrlSchema,
  variant: linkVariantSchema,
  isActive: z.boolean(),
  imageUrl: z.union([
    httpUrlSchema,
    z.literal(""),
    z.null(),
    z.string().regex(/^icon:[A-Za-z0-9]+$/, "Invalid icon."),
  ]),
});

export function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed || ALLOWED_SCHEMES.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

/** Favicon served from Google's renderer, so Rinku stores nothing for it. */
export function faviconUrl(url: string): string | null {
  try {
    const hostname = new URL(url).hostname;
    if (!hostname) {
      return null;
    }
    return `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`;
  } catch (error) {
    log.warn(
      "links",
      "faviconUrl could not parse URL",
      error instanceof Error ? error.message : String(error),
    );
    return null;
  }
}

export function displayUrl(url: string): string {
  return url.replace(/^https?:\/\//i, "");
}

// Sparse positions with gaps: reordering rewrites only the rows whose spot
// changed, so a dense 0..n sequence would churn the whole list on every drag.
export const POSITION_GAP = 1000;

export function positionAfter(max: number | null | undefined): number {
  return (max ?? -POSITION_GAP) + POSITION_GAP;
}

/**
 * Midpoint positions for the rows whose spot a reorder changed. Neighbours
 * keep their positions, so no cascade; the dragged row lands between them.
 */
export function changedPositions(
  current: ReadonlyArray<{ id: string; position: number }>,
  order: readonly string[],
): Array<{ id: string; position: number }> {
  const positions = new Map(current.map((link) => [link.id, link.position]));
  const updates: Array<{ id: string; position: number }> = [];

  order.forEach((id, index) => {
    const prevId = index > 0 ? order[index - 1] : undefined;
    const nextId = index < order.length - 1 ? order[index + 1] : undefined;
    const prev = prevId === undefined ? undefined : positions.get(prevId);
    const next = nextId === undefined ? undefined : positions.get(nextId);

    let position: number | undefined;
    if (prev !== undefined && next !== undefined) {
      const mid = Math.floor((prev + next) / 2);
      if (mid > prev) {
        position = mid;
      }
    } else if (prev !== undefined) {
      position = prev + POSITION_GAP;
    } else if (next !== undefined) {
      position = next - POSITION_GAP;
    } else {
      position = 0;
    }

    if (position !== undefined && position !== positions.get(id)) {
      updates.push({ id, position });
    }
  });

  return updates;
}

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

// The database caps lengths in characters, and JS string length counts UTF-16
// code units, so an emoji-heavy title would hit the client cap long before
// the database's; the cap counts code points too.
const maxChars = (limit: number) =>
  z
    .string()
    .refine((value) => [...value].length <= limit, `Use ${limit} characters or fewer.`);

export const linkTitleSchema = maxChars(100).refine(
  (value) => value.trim().length > 0,
  "Give the link a title.",
);

// A heading is a label grouping the rows under it, not prose: the tighter
// budget keeps it to two lines on the public page's narrowest width.
export const HEADING_TITLE_MAX = 60;

export const headingTitleSchema = maxChars(HEADING_TITLE_MAX).refine(
  (value) => value.trim().length > 0,
  "Give the heading a title.",
);

export const linkVariantSchema = z.enum(["classic", "featured"]);

// The age-gate bound, mirroring the links_min_age check so the client,
// the action payload, and the gate cookie all reject the same values.
export const minAgeSchema = z.number().int().min(13).max(99);

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

/** True when the input parses to an acceptable http/mailto/tel URL. */
export function isLinkLike(input: string): boolean {
  const normalized = normalizeUrl(input.trim());
  if (!linkUrlSchema.safeParse(normalized).success) return false;
  try {
    const url = new URL(normalized);
    if (url.protocol === "mailto:" || url.protocol === "tel:") return true;
    return url.hostname.includes(".");
  } catch {
    return false;
  }
}

/** Bare www-stripped hostname, for the default title of a pasted link. */
export function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "") || url;
  } catch {
    return url;
  }
}

export function positionAfter(max: number | null | undefined): number {
  return (max ?? -POSITION_GAP) + POSITION_GAP;
}

/**
 * Midpoint position for the dragged row alone: its new neighbours keep their
 * positions, so no cascade and no churn. Only the dragged row gets an update,
 * because reading neighbour positions off a stale snapshot while walking the
 * whole order misplaces rows the drag never touched. The one exception is a
 * collapsed gap (see renumberFrom): the crowded span is re-spaced rather than
 * refusing the move.
 */
export function changedPositions(
  current: ReadonlyArray<{ id: string; position: number }>,
  order: readonly string[],
  movedId: string,
): Array<{ id: string; position: number }> {
  const index = order.indexOf(movedId);
  if (index === -1) {
    return [];
  }
  const positions = new Map(current.map((link) => [link.id, link.position]));
  const prevId = index > 0 ? order[index - 1] : undefined;
  const nextId = index < order.length - 1 ? order[index + 1] : undefined;
  const prev = prevId === undefined ? undefined : positions.get(prevId);
  const next = nextId === undefined ? undefined : positions.get(nextId);

  let position: number;
  if (prev !== undefined && next !== undefined) {
    const mid = Math.floor((prev + next) / 2);
    if (mid > prev) {
      position = mid;
    } else {
      // The gap collapsed below an integer (about ten drags into the same
      // slot): renumber from the previous neighbour to make room again.
      return renumberFrom(order, index - 1, movedId, positions);
    }
  } else if (prev !== undefined) {
    position = prev + POSITION_GAP;
  } else if (next !== undefined) {
    position = next - POSITION_GAP;
  } else {
    position = 0;
  }

  const before = positions.get(movedId);
  return position === before ? [] : [{ id: movedId, position }];
}

/**
 * Re-spaces the crowded span from `start`, which keeps its spot. Rare, and
 * stops at the first row already a full gap out, so the rewrite stays local
 * to the rows that actually collapsed. The dragged row is the exception to
 * that stop: its old position belongs to the neighbourhood it came from, not
 * this span, so it always takes its target and the walk judges only the rows
 * that stayed.
 */
function renumberFrom(
  order: readonly string[],
  start: number,
  movedId: string,
  positions: Map<string, number>,
): Array<{ id: string; position: number }> {
  const updates: Array<{ id: string; position: number }> = [];
  const anchor = order[start];
  if (anchor === undefined) {
    return updates;
  }
  let previous = positions.get(anchor) ?? 0;
  for (let i = start + 1; i < order.length; i += 1) {
    const id = order[i];
    if (id === undefined) {
      break;
    }
    const existing = positions.get(id);
    const target = previous + POSITION_GAP;
    if (id !== movedId && existing !== undefined && existing >= target) {
      break;
    }
    if (existing !== target) {
      updates.push({ id, position: target });
    }
    previous = target;
  }
  return updates;
}

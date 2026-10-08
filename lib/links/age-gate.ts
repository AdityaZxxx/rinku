import { createHmac, timingSafeEqual } from "node:crypto";
import * as z from "zod";

/**
 * Age-gate unlock proof, kept entirely client-side: a session cookie holding
 * one entry per unlocked link. Each entry binds the link id to the min_age in
 * force when consent was given, so raising a link's gate invalidates earlier
 * unlocks. HMAC-signed so visitors cannot mint their own.
 */

export const AGE_GATE_COOKIE = "rinku_age_gate";

type GateEntry = { linkId: string; minAge: number };

const gatePayloadSchema = z.object({
  v: z.literal(1),
  entries: z.array(
    z.object({ linkId: z.uuid(), minAge: z.number().int().min(13).max(99) }),
  ),
});

// Keep the cookie comfortably under per-cookie limits even on long sessions.
const MAX_ENTRIES = 20;

function secret(): string {
  const value = process.env.AGE_GATE_SECRET;
  if (!value) {
    throw new Error("AGE_GATE_SECRET is not set");
  }
  return value;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

function encode(entries: GateEntry[]): string {
  const payload = JSON.stringify({ v: 1, entries });
  const body = Buffer.from(payload, "utf8").toString("base64url");
  return `${body}.${sign(body)}`;
}

function decode(cookie: string | undefined | null): GateEntry[] {
  if (!cookie) {
    return [];
  }
  const dot = cookie.lastIndexOf(".");
  if (dot <= 0) {
    return [];
  }
  const body = cookie.slice(0, dot);
  const signature = cookie.slice(dot + 1);
  const expected = sign(body);
  // Both are fixed-length HMAC output, so a plain compare is safe short of
  // length mismatch, which timingSafeEqual would throw on.
  if (signature.length !== expected.length) {
    return [];
  }
  if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return [];
  }
  // The cookie is untrusted input: validate its shape before trusting it.
  let raw: unknown;
  try {
    raw = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return [];
  }
  const parsed = gatePayloadSchema.safeParse(raw);
  return parsed.success ? parsed.data.entries : [];
}

/** Whether consent recorded in the cookie clears this link's current gate. */
export function isAgeGateCleared(
  cookie: string | undefined | null,
  linkId: string,
  minAge: number,
): boolean {
  return decode(cookie).some(
    (entry) => entry.linkId === linkId && entry.minAge >= minAge,
  );
}

/** Cookie value after recording consent for one link. Callers set it. */
export function withAgeGateUnlock(
  cookie: string | undefined | null,
  linkId: string,
  minAge: number,
): string {
  const entries = decode(cookie).filter((entry) => entry.linkId !== linkId);
  entries.push({ linkId, minAge });
  return encode(entries.slice(-MAX_ENTRIES));
}

/** Ids of links a given cookie unlocks, for the public page render. */
export function ageGateUnlockedIds(cookie: string | undefined | null): Set<string> {
  return new Set(decode(cookie).map((entry) => entry.linkId));
}

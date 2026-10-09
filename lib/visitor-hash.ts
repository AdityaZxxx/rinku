import type { NextRequest } from "next/server";
import { createHash } from "node:crypto";

/**
 * Pseudonymous visitor identity: hashed client IP and user agent. Profile
 * visits and click-throughs both derive it, and the inputs must stay
 * identical or the same person counts twice.
 */
export function visitorHash(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
  const userAgent = request.headers.get("user-agent") ?? "";
  return createHash("sha256").update(`${forwarded}:${userAgent}`).digest("hex");
}

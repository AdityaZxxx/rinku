import { NextResponse, type NextRequest } from "next/server";
import { createHash } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import * as z from "zod";

import { getUserId } from "@/lib/auth";
import { profiles } from "@/lib/db/schema";
import { withAnonDb } from "@/lib/db/with-user";
import { log } from "@/lib/log";

const BOT_PATTERN =
  /bot|crawl|spider|slurp|mediapartners|baidu|yandex|sogou|exabot|facebot|ia_archiver|ahrefs|semrush|mj12|dotbot|petal|gptbot|claudebot|ccbot|bytespider|facebookexternalhit|twitterbot|linkedinbot|embedly|quora|pinterest|slackbot|discordbot|telegrambot|whatsapp|headless|phantomjs|selenium/i;

export async function POST(request: NextRequest) {
  const userAgent = request.headers.get("user-agent") ?? "";
  if (BOT_PATTERN.test(userAgent)) {
    return new NextResponse(null, { status: 204 });
  }

  const body = z
    .object({ profileId: z.uuid() })
    .safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return new NextResponse(null, { status: 400 });
  }
  const profileId = body.data.profileId;

  // The profile page's owner viewing their own page is not a visit.
  let viewerId: string | null = null;
  try {
    viewerId = await getUserId();
  } catch {
    viewerId = null;
  }

  const [profile] = await withAnonDb((tx) =>
    tx
      .select({ id: profiles.id, userId: profiles.userId })
      .from(profiles)
      .where(eq(profiles.id, profileId))
      .limit(1),
  );
  if (!profile || profile.userId === viewerId) {
    return new NextResponse(null, { status: 204 });
  }

  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
  const visitorHash = createHash("sha256")
    .update(`${forwarded}:${userAgent}`)
    .digest("hex");

  try {
    await withAnonDb((tx) =>
      tx.execute(sql`select public.record_profile_visit(${profile.id}, ${visitorHash})`),
    );
  } catch (error) {
    log.error("visit", "record_profile_visit failed", String(error));
  }

  return new NextResponse(null, { status: 204 });
}

import { Suspense } from "react";
import { notFound } from "next/navigation";
import { sql } from "drizzle-orm";
import * as z from "zod";

import { ActivityChart } from "@/components/insights/activity-chart";
import { DateRangePicker } from "@/components/insights/date-range-picker";
import { Skeleton } from "@/components/ui/skeleton";
import { getUserId } from "@/lib/auth";
import { getLinksByProfile } from "@/lib/db/links";
import { getProfileByUsername } from "@/lib/db/profile";
import { linkClicks, profileVisits } from "@/lib/db/schema";
import { withUserDb } from "@/lib/db/with-user";

export const metadata = { title: "Insights" };

const dayStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => !Number.isNaN(new Date(`${value}T00:00:00Z`).getTime()));

function parseDayString(value: string | string[] | undefined): string | undefined {
  const parsed = dayStringSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

function parseTimeZone(value: string | string[] | undefined): string {
  const parsed = z.string().safeParse(value);
  if (!parsed.success) {
    return "UTC";
  }
  try {
    const probe = new Intl.DateTimeFormat(undefined, { timeZone: parsed.data });
    return probe.resolvedOptions().timeZone ?? "UTC";
  } catch {
    return "UTC";
  }
}

function wallParts(tz: string, date: Date): Intl.DateTimeFormatPart[] {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
}

function partValue(parts: Intl.DateTimeFormatPart[], type: string): number {
  return Number(parts.find((part) => part.type === type)?.value ?? 0);
}

function tzOffsetMs(tz: string, date: Date): number {
  const parts = wallParts(tz, date);
  const wallAsUtc = Date.UTC(
    partValue(parts, "year"),
    partValue(parts, "month") - 1,
    partValue(parts, "day"),
    partValue(parts, "hour"),
    partValue(parts, "minute"),
    partValue(parts, "second"),
  );
  return wallAsUtc - Math.floor(date.getTime() / 1000) * 1000;
}

function zonedDayStart(tz: string, day: string): Date {
  const midnightUtc = new Date(`${day}T00:00:00Z`).getTime();
  const once = new Date(midnightUtc - tzOffsetMs(tz, new Date(midnightUtc)));
  return new Date(midnightUtc - tzOffsetMs(tz, once));
}

function tzDayKey(tz: string, date: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function addDayStr(day: string, amount: number): string {
  const [year = 0, month = 1, date = 1] = day.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, date + amount)).toISOString().slice(0, 10);
}

export default async function InsightsPage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { username } = await params;
  const query = await searchParams;
  const userId = await getUserId();
  if (!userId) {
    notFound();
  }

  const profile = await getProfileByUsername(userId, username);
  if (!profile || profile.userId !== userId) {
    notFound();
  }

  // Insights is request-scoped (searchParams drive the page), so reading the
  // current time at the top is stable for this render.
  // eslint-disable-next-line react/purity
  const timeZone = parseTimeZone(query.tz);
  // eslint-disable-next-line react/purity
  const toDay = parseDayString(query.to) ?? tzDayKey(timeZone, new Date());
  const fromDay = parseDayString(query.from) ?? toDay;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-lg font-medium">Insights</h1>
          <p className="text-muted-foreground text-sm">
            How your links perform on the public page.
          </p>
        </div>
        <DateRangePicker
          key={`${fromDay}${toDay}${timeZone}`}
          initialFrom={fromDay}
          initialTo={toDay}
        />
      </div>

      <Suspense key={`${fromDay}:${toDay}:${timeZone}`} fallback={<InsightsFallback />}>
        <InsightsStats
          userId={userId}
          profileId={profile.id}
          timeZone={timeZone}
          fromDay={fromDay}
          toDay={toDay}
        />
      </Suspense>
    </div>
  );
}

function InsightsFallback() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Loading insights">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-[76px] rounded-lg border" />
        ))}
      </div>
      <Skeleton className="h-48 rounded-lg border" />
    </div>
  );
}

async function InsightsStats({
  userId,
  profileId,
  timeZone,
  fromDay,
  toDay,
}: {
  userId: string;
  profileId: string;
  timeZone: string;
  fromDay: string;
  toDay: string;
}) {
  const links = await getLinksByProfile(userId, profileId);
  const titlesById = new Map(links.map((link) => [link.id, link.title]));

  const rangeStart = zonedDayStart(timeZone, fromDay);
  const rangeEnd = new Date(zonedDayStart(timeZone, addDayStr(toDay, 1)).getTime() - 1);
  const singleDay = fromDay === toDay;

  const [clickDayRows, visitDayRows, totalsByLinkRows, clickTimesRows, visitTimesRows] =
    await withUserDb(userId, async (tx) =>
      Promise.all([
        tx.execute<{ day: string; count: number }>(sql`
          select to_char(${linkClicks.createdAt} at time zone ${timeZone}, 'YYYY-MM-DD') as day,
                 count(*)::int as count
          from link_clicks
          where ${linkClicks.createdAt} >= ${rangeStart.toISOString()} and ${linkClicks.createdAt} <= ${rangeEnd.toISOString()}
          group by 1
        `),
        tx.execute<{ day: string; count: number }>(sql`
          select to_char(${profileVisits.createdAt} at time zone ${timeZone}, 'YYYY-MM-DD') as day,
                 count(*)::int as count
          from profile_visits
          where ${profileVisits.createdAt} >= ${rangeStart.toISOString()} and ${profileVisits.createdAt} <= ${rangeEnd.toISOString()}
          group by 1
        `),
        tx.execute<{ link_id: string; count: number }>(sql`
          select ${linkClicks.linkId} as link_id, count(*)::int as count
          from link_clicks
          where ${linkClicks.createdAt} >= ${rangeStart.toISOString()} and ${linkClicks.createdAt} <= ${rangeEnd.toISOString()}
          group by 1
        `),
        // The chart only needs raw timestamps for a single-day range, so that
        // case fetches them; wider ranges aggregate in SQL above.
        singleDay
          ? tx.execute<{ created_at: Date }>(sql`
              select ${linkClicks.createdAt} as created_at from link_clicks
              where ${linkClicks.createdAt} >= ${rangeStart.toISOString()} and ${linkClicks.createdAt} <= ${rangeEnd.toISOString()}
            `)
          : Promise.resolve([]),
        singleDay
          ? tx.execute<{ created_at: Date }>(sql`
              select ${profileVisits.createdAt} as created_at from profile_visits
              where ${profileVisits.createdAt} >= ${rangeStart.toISOString()} and ${profileVisits.createdAt} <= ${rangeEnd.toISOString()}
            `)
          : Promise.resolve([]),
      ]),
    );

  const clicksByDay = new Map<string, number>();
  const visitsByDay = new Map<string, number>();
  for (const row of clickDayRows) {
    clicksByDay.set(row.day, row.count);
  }
  for (const row of visitDayRows) {
    visitsByDay.set(row.day, row.count);
  }
  const totalClicks = [...clicksByDay.values()].reduce((sum, n) => sum + n, 0);
  const totalVisits = [...visitsByDay.values()].reduce((sum, n) => sum + n, 0);

  const totalsByLink = new Map<string, number>();
  for (const row of totalsByLinkRows) {
    totalsByLink.set(row.link_id, row.count);
  }

  const clickRate = totalVisits > 0 ? Math.round((totalClicks / totalVisits) * 100) : 0;

  const chartData: { day: string; clicks: number; visits: number }[] = [];
  for (let day = fromDay; day <= toDay; day = addDayStr(day, 1)) {
    chartData.push({
      day,
      clicks: clicksByDay.get(day) ?? 0,
      visits: visitsByDay.get(day) ?? 0,
    });
  }

  const ranked = [...totalsByLink.entries()]
    .map(([linkId, count]) => ({
      title: titlesById.get(linkId) ?? "Archived link",
      count,
    }))
    .toSorted((a, b) => b.count - a.count);

  return (
    <>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1 rounded-lg border p-4">
          <span className="text-3xl font-semibold tabular-nums">{totalVisits}</span>
          <span className="text-muted-foreground text-sm">Profile visits</span>
        </div>
        <div className="flex flex-col gap-1 rounded-lg border p-4">
          <span className="text-3xl font-semibold tabular-nums">{totalClicks}</span>
          <span className="text-muted-foreground text-sm">Clicks</span>
        </div>
        <div className="flex flex-col gap-1 rounded-lg border p-4">
          <span className="text-xl font-semibold tabular-nums">{totalsByLink.size}</span>
          <span className="text-muted-foreground text-sm">Unique links</span>
        </div>
        <div className="col-span-2 flex flex-col gap-1 rounded-lg border p-4 sm:col-span-1">
          <span className="text-xl font-semibold tabular-nums">{clickRate}%</span>
          <span className="text-muted-foreground text-sm">Click rate</span>
        </div>
      </div>

      {/* The chart always renders, even with zero activity, so the layout
          stays stable; an empty range just shows flat bars. */}
      <ActivityChart
        data={chartData}
        from={fromDay}
        to={toDay}
        clickTimes={
          singleDay ? clickTimesRows.map((row) => row.created_at.toISOString()) : []
        }
        visitTimes={
          singleDay ? visitTimesRows.map((row) => row.created_at.toISOString()) : []
        }
      />

      {ranked.length > 0 ? (
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-medium">Most clicked links</h2>
          <ul className="flex flex-col divide-y rounded-lg border">
            {ranked.map((row) => {
              const max = ranked[0]?.count ?? 1;
              return (
                <li key={row.title} className="flex flex-col gap-2 p-3">
                  <div className="flex items-center justify-between gap-4">
                    <span className="truncate text-sm">{row.title}</span>
                    <span className="text-muted-foreground shrink-0 text-sm tabular-nums">
                      {row.count} click{row.count === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div className="bg-muted h-1.5 w-full rounded-full">
                    <div
                      className="bg-foreground h-1.5 rounded-full transition-all"
                      style={{ width: `${(row.count / max) * 100}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </>
  );
}

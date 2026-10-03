import { notFound } from "next/navigation";
import { and, gte, lte } from "drizzle-orm";

import { ActivityChart } from "@/components/insights/activity-chart";
import { DateRangePicker } from "@/components/insights/date-range-picker";
import { getUserId } from "@/lib/auth";
import { getLinksByProfile } from "@/lib/db/links";
import { getProfileByUsername } from "@/lib/db/profile";
import { linkClicks, profileVisits } from "@/lib/db/schema";
import { withUserDb } from "@/lib/db/with-user";

export const metadata = { title: "Insights" };

import * as z from "zod";

const daySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .transform((value) => {
    const parsed = new Date(`${value}T00:00:00Z`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  });

const dayKey = (day: Date) => day.toISOString().slice(0, 10);

function parseDay(value: string | string[] | undefined): Date | undefined {
  const parsed = daySchema.safeParse(value);
  return parsed.success && parsed.data ? parsed.data : undefined;
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

  const links = await getLinksByProfile(userId, profile.id);
  const titlesById = new Map(links.map((link) => [link.id, link.title]));

  // Insights is request-scoped (searchParams drive the page), so reading the
  // current time at the top is stable for this render.
  // eslint-disable-next-line react/purity
  const to = parseDay(query.to) ?? new Date();
  const from = parseDay(query.from) ?? to;

  const [clicks, visits] = await withUserDb(userId, async (tx) =>
    Promise.all([
      tx
        .select({
          id: linkClicks.id,
          createdAt: linkClicks.createdAt,
          linkId: linkClicks.linkId,
        })
        .from(linkClicks)
        .where(
          and(
            gte(linkClicks.createdAt, new Date(`${dayKey(from)}T00:00:00Z`)),
            lte(linkClicks.createdAt, new Date(`${dayKey(to)}T23:59:59.999Z`)),
          ),
        ),
      tx
        .select({ id: profileVisits.id, createdAt: profileVisits.createdAt })
        .from(profileVisits)
        .where(
          and(
            gte(profileVisits.createdAt, new Date(`${dayKey(from)}T00:00:00Z`)),
            lte(profileVisits.createdAt, new Date(`${dayKey(to)}T23:59:59.999Z`)),
          ),
        ),
    ]),
  );

  const totalsByLink = new Map<string, number>();
  const clicksByDay = new Map<string, number>();
  const visitsByDay = new Map<string, number>();
  for (const click of clicks) {
    const day = dayKey(click.createdAt);
    clicksByDay.set(day, (clicksByDay.get(day) ?? 0) + 1);
    totalsByLink.set(click.linkId, (totalsByLink.get(click.linkId) ?? 0) + 1);
  }
  for (const visit of visits) {
    const day = dayKey(visit.createdAt);
    visitsByDay.set(day, (visitsByDay.get(day) ?? 0) + 1);
  }

  const clickRate =
    visits.length > 0 ? Math.round((clicks.length / visits.length) * 100) : 0;

  const chartData: { day: string; clicks: number; visits: number }[] = [];
  const dayMs = 24 * 60 * 60 * 1000;
  const spanDays = Math.round((to.getTime() - from.getTime()) / dayMs) + 1;
  for (let i = 0; i < spanDays; i += 1) {
    const day = new Date(from.getTime() + i * dayMs);
    const key = dayKey(day);
    chartData.push({
      day: key,
      clicks: clicksByDay.get(key) ?? 0,
      visits: visitsByDay.get(key) ?? 0,
    });
  }

  const ranked = [...totalsByLink.entries()]
    .map(([linkId, count]) => ({
      title: titlesById.get(linkId) ?? "Archived link",
      count,
    }))
    .toSorted((a, b) => b.count - a.count);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-lg font-medium">Insights</h1>
          <p className="text-muted-foreground text-sm">
            How your links perform on the public page.
          </p>
        </div>
        <DateRangePicker initialFrom={dayKey(from)} initialTo={dayKey(to)} />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="bg-muted/30 flex flex-col gap-1 rounded-lg border p-4">
          <span className="text-3xl font-semibold tabular-nums">{visits.length}</span>
          <span className="text-muted-foreground text-sm">Profile visits</span>
        </div>
        <div className="bg-muted/30 flex flex-col gap-1 rounded-lg border p-4">
          <span className="text-3xl font-semibold tabular-nums">{clicks.length}</span>
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

      {chartData.some((point) => point.visits > 0 || point.clicks > 0) ? (
        <ActivityChart data={chartData} />
      ) : (
        <p className="text-muted-foreground text-sm">No activity in this range yet.</p>
      )}

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
    </div>
  );
}

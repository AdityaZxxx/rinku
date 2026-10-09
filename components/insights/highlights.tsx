import {
  CalendarBlankIcon,
  CursorClickIcon,
  GhostIcon,
  TrendDownIcon,
  TrendUpIcon,
} from "@phosphor-icons/react/ssr";

export type Highlight = {
  kind: "trend" | "concentration" | "dead" | "weekday";
  down?: boolean;
  text: string;
};

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

function percentDelta(current: number, previous: number): number {
  return Math.round(((current - previous) / previous) * 100);
}

/**
 * Rule-based takeaways over the range the page already loaded. Every
 * threshold exists to keep a highlight from overreading a small sample.
 */
export function buildHighlights(input: {
  rangeDays: number;
  visits: number;
  clicks: number;
  prevVisits: number;
  prevClicks: number;
  topLink: { title: string; count: number } | null;
  visibleLinkCount: number;
  deadLinkCount: number;
  days: { day: string; visits: number }[];
}): Highlight[] {
  const items: Highlight[] = [];

  if (input.rangeDays >= 7 && input.prevVisits > 0) {
    const visitDelta = percentDelta(input.visits, input.prevVisits);
    const clickDelta =
      input.prevClicks > 0 ? percentDelta(input.clicks, input.prevClicks) : null;
    const clauses: string[] = [];
    if (Math.abs(visitDelta) >= 10) {
      clauses.push(
        `visits are ${visitDelta >= 0 ? "up" : "down"} ${Math.abs(visitDelta)}%`,
      );
    }
    if (clickDelta !== null && Math.abs(clickDelta) >= 10) {
      clauses.push(
        `clicks are ${clickDelta >= 0 ? "up" : "down"} ${Math.abs(clickDelta)}%`,
      );
    }
    if (clauses.length > 0) {
      items.push({
        kind: "trend",
        down: Math.abs(visitDelta) >= 10 ? visitDelta < 0 : (clickDelta ?? 0) < 0,
        text: `${clauses.join(" and ").replace(/^./, (c) => c.toUpperCase())} vs the previous ${input.rangeDays} days.`,
      });
    }
  }

  const top = input.topLink;
  if (top && top.count >= 5 && input.clicks > 0) {
    const share = Math.round((top.count / input.clicks) * 100);
    if (share >= 50) {
      items.push({
        kind: "concentration",
        text: `"${top.title}" gets ${share}% of all clicks.`,
      });
    }
  }

  if (input.visibleLinkCount > 0 && input.deadLinkCount > 0 && input.clicks >= 3) {
    items.push({
      kind: "dead",
      text: `${input.deadLinkCount} of your ${input.visibleLinkCount} links got no clicks in this period.`,
    });
  }

  if (input.rangeDays >= 7 && input.visits >= 7) {
    const counts = Array.from({ length: 7 }, () => 0);
    for (const day of input.days) {
      const weekday = new Date(`${day.day}T00:00:00Z`).getUTCDay();
      counts[weekday] = (counts[weekday] ?? 0) + day.visits;
    }
    const best = counts.indexOf(Math.max(...counts));
    items.push({
      kind: "weekday",
      text: `${WEEKDAYS[best] ?? ""} is your busiest day for visits.`,
    });
  }

  return items;
}

function HighlightIcon({ item, className }: { item: Highlight; className: string }) {
  if (item.kind === "trend") {
    return item.down ? (
      <TrendDownIcon className={className} />
    ) : (
      <TrendUpIcon className={className} />
    );
  }
  if (item.kind === "concentration") {
    return <CursorClickIcon className={className} />;
  }
  if (item.kind === "dead") {
    return <GhostIcon className={className} />;
  }
  return <CalendarBlankIcon className={className} />;
}

export function Highlights({ items }: { items: Highlight[] }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-medium">Highlights</h2>
      {items.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border p-4 text-sm">
          Highlights appear as your page gets traffic.
        </p>
      ) : (
        <ul className="flex flex-col divide-y rounded-lg border">
          {items.map((item) => (
            <li key={item.text} className="flex items-start gap-3 p-3">
              <HighlightIcon
                item={item}
                className="text-muted-foreground mt-0.5 size-4 shrink-0"
              />
              <span className="text-sm">{item.text}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

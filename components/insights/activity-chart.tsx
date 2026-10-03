"use client";

import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";

import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

function hourLabel(hour: number): string {
  return new Date(2020, 0, 1, hour).toLocaleTimeString(undefined, {
    hour: "numeric",
  });
}

const HOUR_LABELS = Array.from({ length: 24 }, (_, hour) => hourLabel(hour));

export function ActivityChart({
  data,
  from,
  to,
  clickTimes,
  visitTimes,
}: {
  data: { day: string; clicks: number; visits: number }[];
  from: string;
  to: string;
  clickTimes: string[];
  visitTimes: string[];
}) {
  const hourlyData = useMemo(() => {
    if (from !== to) {
      return null;
    }
    const bins = Array.from({ length: 24 }, () => ({ clicks: 0, visits: 0 }));
    for (const iso of clickTimes) {
      const bin = bins[new Date(iso).getHours()];
      if (bin) {
        bin.clicks += 1;
      }
    }
    for (const iso of visitTimes) {
      const bin = bins[new Date(iso).getHours()];
      if (bin) {
        bin.visits += 1;
      }
    }
    return HOUR_LABELS.map((hour, index) => ({
      day: hour,
      clicks: bins[index]?.clicks ?? 0,
      visits: bins[index]?.visits ?? 0,
    }));
  }, [from, to, clickTimes, visitTimes]);

  return (
    <ChartContainer
      config={{
        visits: { label: "Visits", color: "var(--chart-2)" },
        clicks: { label: "Clicks", color: "var(--chart-3)" },
      }}
      className="aspect-[2/1] w-full"
    >
      <BarChart data={hourlyData ?? data}>
        <CartesianGrid vertical={false} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <XAxis
          dataKey="day"
          tickLine={false}
          axisLine={false}
          tickFormatter={hourlyData ? undefined : (value: string) => value.slice(5)}
          interval={hourlyData ? 2 : undefined}
        />
        <Bar dataKey="visits" fill="var(--color-visits)" radius={4} />
        <Bar dataKey="clicks" fill="var(--color-clicks)" radius={4} />
      </BarChart>
    </ChartContainer>
  );
}

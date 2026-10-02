"use client";

import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";

import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

export function ActivityChart({
  data,
}: {
  data: { day: string; clicks: number; visits: number }[];
}) {
  return (
    <ChartContainer
      config={{
        visits: { label: "Visits", color: "var(--chart-2)" },
        clicks: { label: "Clicks", color: "var(--chart-1)" },
      }}
      className="aspect-[2/1] w-full"
    >
      <BarChart data={data}>
        <CartesianGrid vertical={false} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <XAxis
          dataKey="day"
          tickLine={false}
          axisLine={false}
          tickFormatter={(value: string) => value.slice(5)}
        />
        <Bar dataKey="visits" fill="var(--color-visits)" radius={4} />
        <Bar dataKey="clicks" fill="var(--color-clicks)" radius={4} />
      </BarChart>
    </ChartContainer>
  );
}

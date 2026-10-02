"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { DateRange } from "react-day-picker";
import { CalendarBlankIcon } from "@phosphor-icons/react";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const PRESETS = [
  { label: "Today", days: 1 },
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
] as const;

function toIso(day: Date): string {
  return day.toISOString().slice(0, 10);
}

export function DateRangePicker({
  initialFrom,
  initialTo,
}: {
  initialFrom: string | undefined;
  initialTo: string | undefined;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [range, setRange] = useState<DateRange | undefined>(() => ({
    from: initialFrom ? new Date(`${initialFrom}T00:00:00Z`) : undefined,
    to: initialTo ? new Date(`${initialTo}T00:00:00Z`) : undefined,
  }));

  function push(from: Date | undefined, to: Date | undefined) {
    if (!from || !to) {
      return;
    }
    const params = new URLSearchParams();
    params.set("from", toIso(from));
    params.set("to", toIso(to));
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {PRESETS.map((preset) => (
        <Button
          key={preset.label}
          variant="outline"
          size="sm"
          onClick={() => {
            const to = new Date();
            const from = new Date();
            from.setDate(from.getDate() - (preset.days - 1));
            setRange({ from, to });
            push(from, to);
          }}
        >
          {preset.label}
        </Button>
      ))}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button variant="outline" size="sm">
              <CalendarBlankIcon />
              {range?.from && range?.to
                ? `${format(range.from, "MMM d")} – ${format(range.to, "MMM d, yyyy")}`
                : "Pick a range"}
            </Button>
          }
        />
        <PopoverContent align="end" className="w-auto p-0">
          <Calendar
            mode="range"
            selected={range}
            onSelect={(next) => {
              setRange(next);
              if (next?.from && next?.to) {
                push(next.from, next.to);
                setOpen(false);
              }
            }}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

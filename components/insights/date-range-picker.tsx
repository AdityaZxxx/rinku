"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { DateRange } from "react-day-picker";
import { CalendarBlankIcon } from "@phosphor-icons/react";
import { format } from "date-fns";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const PRESETS = [
  { label: "Today", days: 1 },
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
] as const;

function localDayKey(day: Date): string {
  const month = String(day.getMonth() + 1).padStart(2, "0");
  const date = String(day.getDate()).padStart(2, "0");
  return `${day.getFullYear()}-${month}-${date}`;
}

function parseLocalDay(value: string): Date {
  const [year = 0, month = 1, day = 1] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function browserTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

const STORAGE_KEY = "rinku:insights:range";

const storedSchema = z.discriminatedUnion("kind", [
  // A rolling preset ("last 7 days") re-anchors to today on each visit.
  z.object({ kind: z.literal("preset"), days: z.number().int().positive() }),
  z.object({ kind: z.literal("range"), from: z.string(), to: z.string() }),
]);

type StoredRange = z.infer<typeof storedSchema>;

function readStoredRange(): StoredRange | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = storedSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

function rememberRange(stored: StoredRange) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  } catch {
    // Storage can be unavailable (private mode); persistence is best-effort.
  }
}

function presetRange(days: number) {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - (days - 1));
  return { from: localDayKey(from), to: localDayKey(to) };
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
    from: initialFrom ? parseLocalDay(initialFrom) : undefined,
    to: initialTo ? parseLocalDay(initialTo) : undefined,
  }));

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (!params.get("tz") && !params.get("from") && !params.get("to")) {
      const stored = readStoredRange();
      const today = localDayKey(new Date());
      const restored =
        stored?.kind === "preset"
          ? presetRange(stored.days)
          : stored?.kind === "range"
            ? { from: stored.from, to: stored.to }
            : { from: today, to: today };
      params.set("from", restored.from);
      params.set("to", restored.to);
      params.set("tz", browserTimeZone());
      router.replace(`?${params.toString()}`, { scroll: false });
    }
  }, [router]);

  function push(from: Date | undefined, to: Date | undefined) {
    if (!from || !to) {
      return;
    }
    const params = new URLSearchParams();
    params.set("from", localDayKey(from));
    params.set("to", localDayKey(to));
    params.set("tz", browserTimeZone());
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
            rememberRange({ kind: "preset", days: preset.days });
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
                rememberRange({
                  kind: "range",
                  from: localDayKey(next.from),
                  to: localDayKey(next.to),
                });
              }
            }}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

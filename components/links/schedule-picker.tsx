"use client";

import { useState } from "react";
import type { DateRange } from "react-day-picker";
import { endOfDay, format, startOfDay } from "date-fns";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/** Short date label for a row, e.g. "Oct 6 – Oct 20, 2026". Null otherwise. */
export function scheduleSummary(
  from: Date | string | null,
  until: Date | string | null,
): string | null {
  const fromDate = from ? new Date(from) : null;
  const untilDate = until ? new Date(until) : null;
  if (fromDate && untilDate) {
    return `${format(fromDate, "MMM d")} – ${format(untilDate, "MMM d, yyyy")}`;
  }
  if (fromDate) {
    return `From ${format(fromDate, "MMM d, yyyy")}`;
  }
  if (untilDate) {
    return `Until ${format(untilDate, "MMM d, yyyy")}`;
  }
  return null;
}

/**
 * Date-range popover for a link's visibility window, after the insights
 * date-range-picker: pick a start, pick an end, the window saves and closes.
 * Full days only: the from date means the start of that day, the until date
 * the end of that day, so picking Oct 20 keeps the link up for all of Oct 20.
 */
export function SchedulePicker({
  from,
  until,
  onSave,
  trigger,
}: {
  from: Date | string | null;
  until: Date | string | null;
  onSave: (from: Date | null, until: Date | null) => void;
  trigger: React.ReactElement;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={trigger} />
      <PopoverContent align="end" className="w-fit p-0">
        {/* Remounted on every open so the draft starts from the saved range. */}
        {open ? (
          <ScheduleCalendar
            from={from}
            until={until}
            onSave={(nextFrom, nextUntil) => {
              onSave(nextFrom, nextUntil);
              setOpen(false);
            }}
          />
        ) : null}
      </PopoverContent>
    </Popover>
  );
}

function ScheduleCalendar({
  from,
  until,
  onSave,
}: {
  from: Date | string | null;
  until: Date | string | null;
  onSave: (from: Date | null, until: Date | null) => void;
}) {
  const [range, setRange] = useState<DateRange | undefined>({
    from: from ? new Date(from) : undefined,
    to: until ? new Date(until) : undefined,
  });
  const scheduled = from !== null || until !== null;
  return (
    <div className="flex flex-col items-center">
      <Calendar
        mode="range"
        selected={range}
        onSelect={(next) => {
          setRange(next);
          if (next?.from && next?.to) {
            onSave(startOfDay(next.from), endOfDay(next.to));
          }
        }}
        numberOfMonths={1}
      />
      {scheduled ? (
        <div className="flex w-full justify-end border-t p-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onSave(null, null)}
          >
            Remove schedule
          </Button>
        </div>
      ) : null}
    </div>
  );
}

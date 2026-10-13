"use client";

import { ColorPicker } from "@/components/ui/color-picker";
import { Slider } from "@/components/ui/slider";

/** The four-step spacing scale, as read on the slider's value chip. */
export function spacingLabel(value: number): string {
  switch (value) {
    case 1:
      return "Tight";
    case 2:
      return "Regular";
    case 3:
      return "Loose";
    case 4:
      return "Wide";
    default:
      return String(value);
  }
}

/** The four-step thickness scale, as read on the slider's value chip. */
export function thicknessLabel(value: number): string {
  switch (value) {
    case 1:
      return "Fine";
    case 2:
      return "Regular";
    case 3:
      return "Bold";
    case 4:
      return "Heavy";
    default:
      return String(value);
  }
}

function isBareSliderValue(next: number | readonly number[]): next is number {
  return !Array.isArray(next);
}

/**
 * Base UI reports single-thumb pointer moves as a bare number, but keyboard
 * steps in the shape of the `value` prop (here a one-entry array), so unwrap
 * either shape to the thumb's value.
 */
function singleThumbValue(next: number | readonly number[]): number | undefined {
  return isBareSliderValue(next) ? next : next[0];
}
export function ColorField({
  label,
  value,
  onPreview,
  onCommit,
}: {
  label: string;
  value: string;
  onPreview: (value: string) => void;
  onCommit: (value: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border px-3 py-2">
      <div className="flex min-w-0 flex-col">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-muted-foreground text-xs uppercase">{value}</span>
      </div>
      <ColorPicker value={value} onChange={onPreview} onCommit={onCommit} label={label} />
    </div>
  );
}

export function SliderField({
  label,
  labelledBy,
  value,
  min,
  max,
  display,
  onChange,
}: {
  label: string;
  labelledBy: string;
  value: number;
  min: number;
  max: number;
  display: (value: number) => string;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border px-3 py-2">
      <span id={labelledBy} className="shrink-0 text-sm font-medium">
        {label}
      </span>
      <Slider
        value={[value]}
        min={min}
        max={max}
        aria-labelledby={labelledBy}
        onValueChange={(next) => {
          const nextValue = singleThumbValue(next);
          if (nextValue !== undefined) {
            onChange(nextValue);
          }
        }}
        className="min-w-0 flex-1"
      />
      <span className="text-muted-foreground w-16 shrink-0 text-right text-xs">
        {display(value)}
      </span>
    </div>
  );
}

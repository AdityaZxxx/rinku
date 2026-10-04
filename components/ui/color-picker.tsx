"use client"

import * as React from "react"
import { HexColorPicker } from "react-colorful"
import { cn } from "cn"

import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

const HEX_PATTERN = /^#[0-9a-fA-F]{6}$/

const PRESETS = [
  "#111111",
  "#ffffff",
  "#6e6e6e",
  "#1c1917",
  "#0d3b2e",
  "#0f172a",
  "#7a5cff",
  "#ff5e7e",
  "#ff9a7a",
  "#e0f2ff",
  "#d9f2e6",
  "#faf6ee",
]

function normalizeHex(value: string): string | null {
  const trimmed = value.trim()
  if (HEX_PATTERN.test(trimmed)) {
    return trimmed.toLowerCase()
  }
  const short = /^#([0-9a-fA-F]{3})$/.exec(trimmed)
  if (short) {
    const digits = short[1] ?? ""
    const expanded = `#${digits
      .split("")
      .map((char) => char + char)
      .join("")}`.toLowerCase()
    return expanded
  }
  return null
}

function ColorPicker({
  value,
  onChange,
  onCommit,
  label,
}: {
  value: string
  onChange: (value: string) => void
  onCommit?: (value: string) => void
  label: string
}) {
  const [open, setOpen] = React.useState(false)
  const [draft, setDraft] = React.useState(value)

  React.useEffect(() => {
    if (!open) {
      setDraft(value)
    }
  }, [open, value])

  function commit(next: string) {
    const normalized = normalizeHex(next)
    if (normalized) {
      onCommit?.(normalized)
    }
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) {
          commit(draft)
        }
      }}
    >
      <PopoverTrigger
        aria-label={label}
        title={value}
        style={{ backgroundColor: value }}
        className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-foreground/15 shadow-sm transition hover:scale-105"
      />
      <PopoverContent className="w-60 gap-3 p-3" align="start">
        <HexColorPicker
          color={draft}
          onChange={(next) => {
            setDraft(next)
            onChange(next)
          }}
          style={{ width: "100%" }}
        />
        <div className="flex items-center gap-2">
          <span
            aria-hidden="true"
            style={{ backgroundColor: draft }}
            className="size-8 shrink-0 rounded-lg border border-foreground/15"
          />
          <Input
            value={draft}
            maxLength={7}
            spellCheck={false}
            autoComplete="off"
            aria-label={`${label} hex value`}
            onChange={(event) => {
              const next = event.currentTarget.value
              setDraft(next)
              const normalized = normalizeHex(next)
              if (normalized) {
                onChange(normalized)
              }
            }}
            onBlur={(event) => commit(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                commit(draft)
                setOpen(false)
              }
            }}
            className={cn(!normalizeHex(draft) && "border-destructive")}
          />
        </div>
        <div className="grid grid-cols-6 gap-1.5">
          {PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              aria-label={`Use ${preset}`}
              title={preset}
              style={{ backgroundColor: preset }}
              onClick={() => {
                setDraft(preset)
                onChange(preset)
                onCommit?.(preset)
              }}
              className={cn(
                "size-7 cursor-pointer rounded-full border border-foreground/15 transition hover:scale-110",
                draft.toLowerCase() === preset && "ring-2 ring-ring ring-offset-1"
              )}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

export { ColorPicker }

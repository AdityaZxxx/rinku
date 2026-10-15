"use client";

import { useState } from "react";
import type { Appearance } from "@/lib/profiles/appearance";
import { CheckIcon } from "@phosphor-icons/react";

import { ColorField } from "@/components/appearance/appearance-fields";
import { AllFontsStylesheet } from "@/components/appearance/font-stylesheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { fontStack, fonts } from "@/lib/profiles/appearance-fonts";
import { cn } from "@/lib/utils";

type Tweak = (patch: Partial<Appearance>, key?: string) => void;

export function FontSection({ values, tweak }: { values: Appearance; tweak: Tweak }) {
  const [fontOpen, setFontOpen] = useState(false);
  const [fontQuery, setFontQuery] = useState("");
  const visibleFonts = fonts.filter((font) =>
    `${font.label} ${font.sample}`.toLowerCase().includes(fontQuery.trim().toLowerCase()),
  );

  return (
    <>
      <Field>
        <FieldLabel id="font-label">Font</FieldLabel>
        <AllFontsStylesheet />
        <Dialog open={fontOpen} onOpenChange={setFontOpen}>
          <DialogTrigger
            render={
              <button
                type="button"
                aria-label="Change font"
                className="border-input bg-card hover:bg-accent flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left"
              />
            }
          >
            <span
              aria-hidden="true"
              className="text-2xl leading-none font-semibold"
              style={{ fontFamily: fontStack(values.fontId) }}
            >
              Aa
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-sm font-medium">
                {fonts.find((font) => font.id === values.fontId)?.label ?? "Inter"}
              </span>
              <span className="text-muted-foreground text-xs">
                {fonts.find((font) => font.id === values.fontId)?.sample ?? "Modern sans"}
              </span>
            </span>
            <span className="text-muted-foreground text-sm underline">Change</span>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Choose a font</DialogTitle>
              <DialogDescription>
                Every font is served from the same build, so picking one is free.
              </DialogDescription>
            </DialogHeader>
            <Input
              value={fontQuery}
              onChange={(event) => setFontQuery(event.target.value)}
              placeholder="Search fonts…"
              autoComplete="off"
              aria-label="Search fonts"
            />
            <div className="-mx-1 flex max-h-80 flex-col gap-1 overflow-y-auto px-1">
              {visibleFonts.map((font) => (
                <button
                  key={font.id}
                  type="button"
                  onClick={() => {
                    tweak({ fontId: font.id });
                    setFontOpen(false);
                  }}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 text-left",
                    values.fontId === font.id
                      ? "border-ring ring-ring/30 ring-3"
                      : "border-input hover:bg-accent",
                  )}
                >
                  <span
                    aria-hidden="true"
                    className="text-2xl leading-none font-semibold"
                    style={{ fontFamily: fontStack(font.id) }}
                  >
                    Aa
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="text-sm font-medium">{font.label}</span>
                    <span className="text-muted-foreground text-xs">{font.sample}</span>
                  </span>
                  {values.fontId === font.id ? (
                    <CheckIcon className="text-muted-foreground size-4" />
                  ) : null}
                </button>
              ))}
              {visibleFonts.length === 0 ? (
                <p className="text-muted-foreground py-6 text-center text-sm">
                  No fonts match &ldquo;{fontQuery}&rdquo;.
                </p>
              ) : null}
            </div>
          </DialogContent>
        </Dialog>
      </Field>

      <div className="grid gap-2 sm:grid-cols-2">
        <ColorField
          label="Titles"
          value={values.titleColor}
          onPreview={(titleColor) => tweak({ titleColor }, "titleColor")}
          onCommit={(titleColor) => tweak({ titleColor }, "titleColor")}
        />
        <ColorField
          label="Body text"
          value={values.bodyColor}
          onPreview={(bodyColor) => tweak({ bodyColor }, "bodyColor")}
          onCommit={(bodyColor) => tweak({ bodyColor }, "bodyColor")}
        />
      </div>
    </>
  );
}

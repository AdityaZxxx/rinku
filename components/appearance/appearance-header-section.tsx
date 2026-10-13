"use client";

import type { ReactNode } from "react";
import type { Appearance } from "@/lib/profiles/appearance";

import {
  AlignmentPreview,
  EntrancePreview,
  HeaderPreview,
  HoverPreview,
} from "@/components/appearance/appearance-previews";
import { OptionTile } from "@/components/appearance/appearance-tiles";
import { Field, FieldLabel } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import {
  linkEntrances,
  linkHovers,
  pageAlignments,
} from "@/lib/profiles/appearance-options";
import { headerStyleIds } from "@/lib/profiles/schema";

type Tweak = (patch: Partial<Appearance>, key?: string) => void;

export function HeaderSection({
  values,
  tweak,
  scrubTile,
  scrubEnd,
  username,
  bannerSlot,
}: {
  values: Appearance;
  tweak: Tweak;
  scrubTile: (patch: Partial<Appearance>) => void;
  scrubEnd: () => void;
  username: string;
  /** Rendered between the header-style tiles and the username toggle, where the banner media row belongs. */
  bannerSlot?: ReactNode;
}) {
  return (
    <>
      <Field>
        <FieldLabel id="header-style-label">Header</FieldLabel>
        <div
          role="radiogroup"
          aria-labelledby="header-style-label"
          className="grid grid-cols-3 gap-2"
        >
          {headerStyleIds.map((value) => (
            <OptionTile
              key={value}
              name="header-style"
              value={value}
              label={value}
              checked={values.headerStyle === value}
              onSelect={() => tweak({ headerStyle: value })}
              onScrub={() => scrubTile({ headerStyle: value })}
              onScrubEnd={scrubEnd}
            >
              <HeaderPreview value={value} look={values} />
            </OptionTile>
          ))}
        </div>
      </Field>

      {bannerSlot}

      <div className="flex items-center justify-between gap-4 rounded-xl border p-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-medium">Show @{username}</span>
          <span className="text-muted-foreground text-xs leading-normal text-pretty">
            Turn on to show @{username} under your name. Your page link and search results
            keep it either way.
          </span>
        </div>
        <Switch
          checked={values.showUsername}
          onCheckedChange={(showUsername) => tweak({ showUsername })}
          aria-label={`Show @${username}`}
        />
      </div>

      <Field>
        <FieldLabel id="alignment-label">Page alignment</FieldLabel>
        <div
          role="radiogroup"
          aria-labelledby="alignment-label"
          className="grid grid-cols-2 gap-2"
        >
          {pageAlignments.map((alignment) => (
            <OptionTile
              key={alignment.id}
              name="page-alignment"
              value={alignment.id}
              label={alignment.label}
              checked={values.pageAlignment === alignment.id}
              onSelect={() => tweak({ pageAlignment: alignment.id })}
              onScrub={() => scrubTile({ pageAlignment: alignment.id })}
              onScrubEnd={scrubEnd}
            >
              <AlignmentPreview alignment={alignment.id} look={values} />
            </OptionTile>
          ))}
        </div>
      </Field>

      <Field>
        <FieldLabel id="entrance-label">Link entrance</FieldLabel>
        <div
          role="radiogroup"
          aria-labelledby="entrance-label"
          className="grid grid-cols-3 gap-2 sm:grid-cols-5"
        >
          {linkEntrances.map((entrance) => (
            <OptionTile
              key={entrance.id}
              name="link-entrance"
              value={entrance.id}
              label={entrance.label}
              checked={values.linkEntrance === entrance.id}
              onSelect={() => tweak({ linkEntrance: entrance.id })}
              onScrub={() => scrubTile({ linkEntrance: entrance.id })}
              onScrubEnd={scrubEnd}
            >
              <EntrancePreview id={entrance.id} look={values} />
            </OptionTile>
          ))}
        </div>
      </Field>

      <Field>
        <FieldLabel id="hover-label">Hover effect</FieldLabel>
        <div
          role="radiogroup"
          aria-labelledby="hover-label"
          className="grid grid-cols-3 gap-2 sm:grid-cols-4"
        >
          {linkHovers.map((hover) => (
            <OptionTile
              key={hover.id}
              name="link-hover"
              value={hover.id}
              label={hover.label}
              checked={values.linkHover === hover.id}
              onSelect={() => tweak({ linkHover: hover.id })}
              onScrub={() => scrubTile({ linkHover: hover.id })}
              onScrubEnd={scrubEnd}
            >
              <HoverPreview id={hover.id} look={values} />
            </OptionTile>
          ))}
        </div>
      </Field>
    </>
  );
}

"use client";

import type { Appearance } from "@/lib/profiles/appearance";

import {
  ColorField,
  SliderField,
  spacingLabel,
  thicknessLabel,
} from "@/components/appearance/appearance-fields";
import { KindMock, WallpaperKindTile } from "@/components/appearance/appearance-mocks";
import { OptionTile } from "@/components/appearance/appearance-tiles";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  patternSpacingRange,
  patternThicknessRange,
  wallpaperKinds,
  wallpaperPatterns,
} from "@/lib/profiles/appearance-options";

type Tweak = (patch: Partial<Appearance>, key?: string) => void;

export function WallpaperSection({
  values,
  tweak,
  scrubTile,
  scrubEnd,
  onPickMedia,
}: {
  values: Appearance;
  tweak: Tweak;
  scrubTile: (patch: Partial<Appearance>) => void;
  scrubEnd: () => void;
  /** Opens the upload dialog for the image/video wallpaper kinds. */
  onPickMedia: (target: "image" | "video") => void;
}) {
  return (
    <>
      <Field>
        <FieldLabel id="wallpaper-label">Page background</FieldLabel>
        <div
          role="radiogroup"
          aria-labelledby="wallpaper-label"
          className="grid grid-cols-3 gap-2"
        >
          {wallpaperKinds.map((kind) => (
            <WallpaperKindTile
              key={kind.id}
              kind={kind.id}
              label={kind.label}
              checked={values.wallpaperKind === kind.id}
              color={values.wallpaperColor}
              colorB={values.wallpaperColorB}
              pattern={values.wallpaperPattern}
              spacing={values.wallpaperPatternSpacing}
              thickness={values.wallpaperPatternThickness}
              onScrubEnd={scrubEnd}
              onScrub={
                kind.id === "image" || kind.id === "video"
                  ? undefined
                  : () => scrubTile({ wallpaperKind: kind.id })
              }
              onSelect={() => {
                if (kind.id === "image") {
                  onPickMedia("image");
                  tweak({ wallpaperKind: "image" });
                } else if (kind.id === "video") {
                  onPickMedia("video");
                  tweak({ wallpaperKind: "video" });
                } else {
                  tweak({ wallpaperKind: kind.id });
                }
              }}
            />
          ))}
        </div>
      </Field>

      <div className="grid gap-2 sm:grid-cols-2">
        <ColorField
          label={values.wallpaperKind === "gradient" ? "Gradient start" : "Background"}
          value={values.wallpaperColor}
          onPreview={(wallpaperColor) => tweak({ wallpaperColor }, "wallpaperColor")}
          onCommit={(wallpaperColor) => tweak({ wallpaperColor }, "wallpaperColor")}
        />
        {values.wallpaperKind === "gradient" ||
        values.wallpaperKind === "blur" ||
        values.wallpaperKind === "pattern" ? (
          <ColorField
            label={values.wallpaperKind === "gradient" ? "Gradient end" : "Accent"}
            value={values.wallpaperColorB}
            onPreview={(wallpaperColorB) => tweak({ wallpaperColorB }, "wallpaperColorB")}
            onCommit={(wallpaperColorB) => tweak({ wallpaperColorB }, "wallpaperColorB")}
          />
        ) : null}
      </div>

      {values.wallpaperKind === "pattern" ? (
        <>
          <Field>
            <FieldLabel id="pattern-label">Pattern</FieldLabel>
            <div
              role="radiogroup"
              aria-labelledby="pattern-label"
              className="grid grid-cols-3 gap-2 sm:grid-cols-4"
            >
              {wallpaperPatterns.map((pattern) => (
                <OptionTile
                  key={pattern.id}
                  name="wallpaper-pattern"
                  value={pattern.id}
                  label={pattern.label}
                  checked={values.wallpaperPattern === pattern.id}
                  onSelect={() => tweak({ wallpaperPattern: pattern.id })}
                  onScrub={() => scrubTile({ wallpaperPattern: pattern.id })}
                  onScrubEnd={scrubEnd}
                >
                  <KindMock
                    kind="pattern"
                    color={values.wallpaperColor}
                    colorB={values.wallpaperColorB}
                    pattern={pattern.id}
                    spacing={values.wallpaperPatternSpacing}
                    thickness={values.wallpaperPatternThickness}
                  />
                </OptionTile>
              ))}
            </div>
          </Field>
          <div className="grid gap-2">
            <SliderField
              label="Spacing"
              labelledBy="pattern-spacing-label"
              value={values.wallpaperPatternSpacing}
              min={patternSpacingRange.min}
              max={patternSpacingRange.max}
              display={(value) => spacingLabel(value)}
              onChange={(wallpaperPatternSpacing) =>
                tweak({ wallpaperPatternSpacing }, "wallpaperPatternSpacing")
              }
            />
            <SliderField
              label="Thickness"
              labelledBy="pattern-thickness-label"
              value={values.wallpaperPatternThickness}
              min={patternThicknessRange.min}
              max={patternThicknessRange.max}
              display={(value) => thicknessLabel(value)}
              onChange={(wallpaperPatternThickness) =>
                tweak({ wallpaperPatternThickness }, "wallpaperPatternThickness")
              }
            />
          </div>
        </>
      ) : null}
    </>
  );
}

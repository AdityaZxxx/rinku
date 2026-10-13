"use client";

import type { Appearance } from "@/lib/profiles/appearance";

import { ColorField } from "@/components/appearance/appearance-fields";
import {
  ContourMock,
  UmbraMock,
  VariantMock,
} from "@/components/appearance/appearance-mocks";
import { OptionTile } from "@/components/appearance/appearance-tiles";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  buttonContours,
  buttonUmbrae,
  buttonVariants,
} from "@/lib/profiles/appearance-buttons";

type Tweak = (patch: Partial<Appearance>, key?: string) => void;

export function ButtonSection({
  values,
  tweak,
  scrubTile,
  scrubEnd,
}: {
  values: Appearance;
  tweak: Tweak;
  scrubTile: (patch: Partial<Appearance>) => void;
  scrubEnd: () => void;
}) {
  return (
    <>
      <Field>
        <FieldLabel id="variant-label">Button style</FieldLabel>
        <div
          role="radiogroup"
          aria-labelledby="variant-label"
          className="grid grid-cols-2 gap-2 sm:grid-cols-4"
        >
          {buttonVariants.map((variant) => (
            <OptionTile
              key={variant.id}
              name="button-variant"
              value={variant.id}
              label={variant.label}
              checked={values.buttonVariant === variant.id}
              onSelect={() => tweak({ buttonVariant: variant.id })}
              onScrub={() => scrubTile({ buttonVariant: variant.id })}
              onScrubEnd={scrubEnd}
            >
              <VariantMock variant={variant.id} look={values} />
            </OptionTile>
          ))}
        </div>
      </Field>

      <Field>
        <FieldLabel id="corner-label">Corners</FieldLabel>
        <div
          role="radiogroup"
          aria-labelledby="corner-label"
          className="grid grid-cols-3 gap-2 sm:grid-cols-4"
        >
          {buttonContours.map((contour) => (
            <OptionTile
              key={contour.id}
              name="button-contour"
              value={contour.id}
              label={contour.label}
              checked={values.buttonContour === contour.id}
              onSelect={() => tweak({ buttonContour: contour.id })}
              onScrub={() => scrubTile({ buttonContour: contour.id })}
              onScrubEnd={scrubEnd}
            >
              <ContourMock contour={contour.id} look={values} />
            </OptionTile>
          ))}
        </div>
      </Field>

      <Field>
        <FieldLabel id="umbra-label">Shadow</FieldLabel>
        <div
          role="radiogroup"
          aria-labelledby="umbra-label"
          className="grid grid-cols-3 gap-2 sm:grid-cols-4"
        >
          {buttonUmbrae.map((umbra) => (
            <OptionTile
              key={umbra.id}
              name="button-umbra"
              value={umbra.id}
              label={umbra.label}
              checked={values.buttonUmbra === umbra.id}
              onSelect={() => tweak({ buttonUmbra: umbra.id })}
              onScrub={() => scrubTile({ buttonUmbra: umbra.id })}
              onScrubEnd={scrubEnd}
            >
              <UmbraMock umbra={umbra.id} look={values} />
            </OptionTile>
          ))}
        </div>
      </Field>

      {values.buttonUmbra !== "none" ? (
        <ColorField
          label="Shadow color"
          value={values.buttonUmbraColor}
          onPreview={(buttonUmbraColor) =>
            tweak({ buttonUmbraColor }, "buttonUmbraColor")
          }
          onCommit={(buttonUmbraColor) => tweak({ buttonUmbraColor }, "buttonUmbraColor")}
        />
      ) : null}

      <div className="grid gap-2 sm:grid-cols-2">
        <ColorField
          label="Button"
          value={values.buttonColor}
          onPreview={(buttonColor) => tweak({ buttonColor }, "buttonColor")}
          onCommit={(buttonColor) => tweak({ buttonColor }, "buttonColor")}
        />
        <ColorField
          label="Button text"
          value={values.buttonTextColor}
          onPreview={(buttonTextColor) => tweak({ buttonTextColor }, "buttonTextColor")}
          onCommit={(buttonTextColor) => tweak({ buttonTextColor }, "buttonTextColor")}
        />
      </div>
    </>
  );
}

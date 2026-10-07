"use client";

import { useRef, useState, useTransition } from "react";
import type { ChangeEvent } from "react";
import Image from "next/image";
import { ImageSquareIcon, TrashIcon } from "@phosphor-icons/react";
import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";

import { removeSeoImage, updateSeo, uploadSeoImage } from "@/app/actions/profiles";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { imageMaxBytes, seoSchema } from "@/lib/profiles";
import { ogImageUrl } from "@/lib/storage";
import { cn } from "@/lib/utils";

const limits = { metaTitle: 70, metaDescription: 160, keywords: 200 } as const;

function Counter({ value, max }: { value: string; max: number }) {
  const over = value.length > max;
  return (
    <span
      className={cn(
        "text-muted-foreground shrink-0 whitespace-nowrap text-xs tabular-nums",
        over && "text-destructive",
      )}
    >
      {value.length}/{max}
    </span>
  );
}

export function SeoSection({
  profileId,
  username,
  initial,
  fallbackTitle,
  fallbackDescription,
  initialOgImagePath,
}: {
  profileId: string;
  username: string;
  initial: {
    metaTitle: string;
    metaDescription: string;
    keywords: string;
    searchIndexing: boolean;
  };
  fallbackTitle: string;
  fallbackDescription: string;
  initialOgImagePath: string | null;
}) {
  const [ogImagePath, setOgImagePath] = useState(initialOgImagePath);
  const [uploading, startUpload] = useTransition();
  const [removing, startRemove] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const busy = uploading || removing;

  const form = useForm({
    defaultValues: initial,
    validators: { onChange: seoSchema },
    listeners: {
      // Auto-save, the same pattern as the profile editor: the debounced burst
      // of edits is the save trigger, so there is no Save button. A field over
      // its limit is skipped (its error is already showing next to it), and a
      // save failure toasts while the typed value stays for the next attempt.
      onChange: ({ formApi }) => {
        if (!formApi.state.isValid) {
          return;
        }
        void updateSeo({ profileId, ...formApi.state.values }).then((result) => {
          if ("error" in result) {
            toast.error(result.error);
          }
          return result;
        });
      },
      onChangeDebounceMs: 800,
    },
  });

  function onFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Reset the input so choosing the same file again still fires a change.
    event.target.value = "";
    if (!file) {
      return;
    }
    if (file.size > imageMaxBytes.ogImage) {
      toast.error(`Upload an image up to ${imageMaxBytes.ogImage / (1024 * 1024)} MB.`);
      return;
    }
    const data = new FormData();
    data.set("profileId", profileId);
    data.set("file", file);
    startUpload(async () => {
      const result = await uploadSeoImage(data);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      setOgImagePath(result.path);
      toast("Share image updated");
    });
  }

  function removeImage() {
    startRemove(async () => {
      const result = await removeSeoImage({ profileId });
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      setOgImagePath(null);
      toast("Share image removed");
    });
  }

  return (
    <section className="rounded-2xl border p-5">
      <div className="flex flex-col gap-4">
        <div className="flex max-w-sm flex-col gap-2">
          <h2 className="text-sm font-medium">SEO and discoverability</h2>
          <p className="text-muted-foreground text-sm leading-normal text-pretty wrap-break-word">
            Choose how /{username} appears in search results and link previews. Leave a
            field blank to use your profile details.
          </p>
        </div>

        <form
          noValidate
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            // No submit button; this only swallows Enter-key implicit submits.
            event.preventDefault();
          }}
        >
          <form.Field name="metaTitle">
            {(field) => {
              const invalid = field.state.meta.isTouched && !field.state.meta.isValid;
              return (
                <Field data-invalid={invalid}>
                  <div className="flex flex-col gap-1">
                    <FieldLabel htmlFor={field.name}>Page title</FieldLabel>
                    <FieldDescription className="text-pretty">
                      Used in search and link previews.
                    </FieldDescription>
                  </div>
                  <Input
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                    aria-invalid={invalid}
                    placeholder={fallbackTitle}
                  />
                  <div className="flex justify-end">
                    <Counter value={field.state.value} max={limits.metaTitle} />
                  </div>
                  {invalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              );
            }}
          </form.Field>

          <form.Field name="metaDescription">
            {(field) => {
              const invalid = field.state.meta.isTouched && !field.state.meta.isValid;
              return (
                <Field data-invalid={invalid}>
                  <div className="flex flex-col gap-1">
                    <FieldLabel htmlFor={field.name}>Page description</FieldLabel>
                    <FieldDescription className="text-pretty">
                      Used in search and link previews.
                    </FieldDescription>
                  </div>
                  <Textarea
                    id={field.name}
                    name={field.name}
                    rows={3}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                    aria-invalid={invalid}
                    placeholder={fallbackDescription || "Add a short description"}
                    className="resize-y"
                  />
                  <div className="flex justify-end">
                    <Counter value={field.state.value} max={limits.metaDescription} />
                  </div>
                  {invalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              );
            }}
          </form.Field>

          <form.Field name="keywords">
            {(field) => {
              const invalid = field.state.meta.isTouched && !field.state.meta.isValid;
              return (
                <Field data-invalid={invalid}>
                  <div className="flex flex-col gap-1">
                    <FieldLabel htmlFor={field.name}>Keywords</FieldLabel>
                    <FieldDescription className="text-pretty">
                      Separate with commas. Major search engines ignore this field.
                    </FieldDescription>
                  </div>
                  <Input
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                    aria-invalid={invalid}
                    placeholder="designer, writer, portfolio"
                    spellCheck={false}
                  />
                  <div className="flex justify-end">
                    <Counter value={field.state.value} max={limits.keywords} />
                  </div>
                  {invalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              );
            }}
          </form.Field>

          <form.Field name="searchIndexing">
            {(field) => (
              <div className="flex items-center justify-between gap-4 rounded-xl border p-3">
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium">Allow search indexing</span>
                  <span className="text-muted-foreground text-xs leading-normal text-pretty">
                    Turn off to ask search engines not to show this page. Changes may take
                    time.
                  </span>
                </div>
                <Switch
                  checked={field.state.value}
                  onCheckedChange={(checked) => field.handleChange(checked)}
                  aria-label="Allow search indexing"
                />
              </div>
            )}
          </form.Field>
        </form>

        <div className="flex flex-col gap-2 border-t pt-4">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">Share image</span>
            <span className="text-muted-foreground max-w-[65ch] text-xs leading-normal text-pretty">
              Recommended size: 1200 × 630. Without an image, your banner or avatar is
              used in link previews.
            </span>
          </div>
          <div className="bg-muted relative aspect-1200/630 w-full max-w-xs overflow-hidden rounded-xl border">
            {ogImagePath ? (
              <Image
                src={ogImageUrl(ogImagePath)}
                alt=""
                fill
                sizes="320px"
                className="object-cover"
              />
            ) : (
              <div className="text-muted-foreground flex h-full items-center justify-center text-xs">
                No custom image
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              className="sr-only"
              onChange={onFile}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? <Spinner /> : <ImageSquareIcon />}
              {ogImagePath ? "Replace image" : "Upload image"}
            </Button>
            {ogImagePath ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={busy}
                onClick={removeImage}
              >
                {removing ? <Spinner /> : <TrashIcon />}
                Remove image
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

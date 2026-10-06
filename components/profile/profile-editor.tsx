"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import type { Profile } from "@/lib/db/schema";
import { CameraIcon, ImageIcon } from "@phosphor-icons/react";
import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { profileDraftFromProfile, type ProfileDraftFields } from "@/lib/editor-draft";
import { imageMaxBytes, profileBasicsSchema } from "@/lib/profiles";
import { avatarUrl, bannerUrl } from "@/lib/storage";
import { cn } from "@/lib/utils";
import { useEditorDraft } from "./editor-draft-context";
import { PublishControls } from "./publish-controls";
import { useUnsavedChangesWarning } from "./unsaved-guard";
import {
  useDraftDirty,
  usePublishProfileSection,
  useSaveProfileDraft,
} from "./use-draft-mutations";
import { useUpdateProfile, useUploadProfileImage } from "./use-profile-mutations";
import { useProfileQuery } from "./use-profile-query";
import { useUndoRedo } from "./use-undo-redo";

type HeaderStyle =
  | "classic"
  | "hero"
  | "banner"
  | "cutout"
  | "minimal"
  | "left"
  | "statement";

export function ProfileEditor({
  username,
  initialProfile,
  mode,
  initialDraft,
}: {
  username: string;
  initialProfile: Profile;
  mode: "auto" | "manual";
  initialDraft: ProfileDraftFields | null;
}) {
  const manual = mode === "manual";
  const update = useUpdateProfile(username);
  const upload = useUploadProfileImage(username);
  const saveDraft = useSaveProfileDraft(username, initialProfile.id);
  const publish = usePublishProfileSection(username, initialProfile.id);
  const { setProfileDraft } = useEditorDraft() ?? {};
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const { profile } = useProfileQuery(username, initialProfile);

  // In manual mode the editable baseline is the pending draft if one exists,
  // otherwise the published row. Undo starts from that baseline. It is state,
  // not a derivation, so publishing can advance it without a remount.
  const [baseline, setBaseline] = useState<ProfileDraftFields>(
    () => initialDraft ?? profileDraftFromProfile(profile),
  );
  const history = useUndoRedo<ProfileDraftFields>(baseline);
  const dirty = manual && JSON.stringify(history.present) !== JSON.stringify(baseline);
  useDraftDirty(history.present, baseline);
  useUnsavedChangesWarning();

  const form = useForm({
    defaultValues: {
      displayName: history.present.displayName ?? "",
      bio: history.present.bio ?? "",
      // SAFETY: headerStyle is constrained to this union by the database
      // CHECK and the zod schema, so the persisted value narrows safely.
      headerStyle: history.present.headerStyle as HeaderStyle,
    },
    validators: { onChange: profileBasicsSchema },
    listeners: {
      onChange: ({ formApi }) => {
        if (!formApi.state.isValid) {
          return;
        }
        const next: ProfileDraftFields = {
          displayName: formApi.state.values.displayName.trim(),
          bio: formApi.state.values.bio.trim(),
          headerStyle: formApi.state.values.headerStyle,
          // Paths are owned by uploads, not the text form; carry the staged ones.
          avatarPath: history.present.avatarPath,
          bannerPath: history.present.bannerPath,
        };
        if (manual) {
          if (JSON.stringify(next) !== JSON.stringify(history.present)) {
            // One coalesced entry per burst of typing in the same field; any
            // discrete choice (header style) commits on its own via `push`.
            history.push(next, "profile-text");
            setProfileDraft?.(next);
            saveDraft.mutate(next);
          }
          return;
        }
        update.mutate({
          ...formApi.state.values,
          // SAFETY: the form's validator constrains headerStyle to this union.
          headerStyle: formApi.state.values.headerStyle as HeaderStyle,
        });
      },
      onChangeDebounceMs: 800,
    },
  });

  // Undo/redo rewrite the draft and the form. The form reset is what makes the
  // header-style tiles and text fields visibly rewind.
  function applyHistory(next: ProfileDraftFields) {
    form.reset({
      displayName: next.displayName,
      bio: next.bio,
      // SAFETY: headerStyle is constrained to this union by the database CHECK
      // and the zod schema, so the draft's value narrows safely.
      headerStyle: next.headerStyle as HeaderStyle,
    });
    setProfileDraft?.(next);
    saveDraft.mutate(next);
  }

  function onUndo() {
    const next = history.undo();
    if (next) {
      applyHistory(next);
    }
  }

  function onRedo() {
    const next = history.redo();
    if (next) {
      applyHistory(next);
    }
  }

  function onPublish() {
    publish.mutate(undefined, {
      onSuccess: () => {
        setBaseline(history.present);
        history.reset(history.present);
        setProfileDraft?.(null);
        form.reset();
      },
    });
  }

  // Cmd/Ctrl+Z and Shift+Cmd/Ctrl+Z, only while this route is in manual mode.
  useEffect(() => {
    if (!manual) {
      return;
    }
    const handler = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "z") {
        return;
      }
      event.preventDefault();
      if (event.shiftKey) {
        onRedo();
      } else {
        onUndo();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  function onPickImage(event: React.ChangeEvent<HTMLInputElement>) {
    const input = event.target;
    const file = input.files?.[0];
    const target = input.dataset.target;
    input.value = "";
    if (!file || (target !== "avatar" && target !== "banner")) {
      return;
    }
    if (file.size === 0 || file.size > imageMaxBytes[target]) {
      toast.error(
        `Upload a JPEG, PNG, WebP, or AVIF image up to ${imageMaxBytes[target] / (1024 * 1024)} MB.`,
      );
      return;
    }
    upload.mutate(
      { profileId: profile.id, file, target },
      manual
        ? {
            onSuccess: (result) => {
              const next: ProfileDraftFields = {
                ...history.present,
                ...(result.target === "avatar"
                  ? { avatarPath: result.path }
                  : { bannerPath: result.path }),
              };
              history.push(next);
              setProfileDraft?.(next);
              saveDraft.mutate(next);
            },
          }
        : undefined,
    );
  }

  // Manual mode shows the staged paths (an upload lands on the draft, not the
  // live row); auto mode shows the published ones.
  const shownAvatarPath = manual ? history.present.avatarPath : profile.avatarPath;
  const shownBannerPath = manual ? history.present.bannerPath : profile.bannerPath;
  const avatarSrc = shownAvatarPath ? avatarUrl(shownAvatarPath) : null;
  const bannerSrc = shownBannerPath ? bannerUrl(shownBannerPath) : null;
  const fallback = (profile.displayName ?? username)[0]?.toUpperCase();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-lg font-medium">Profile</h1>
          <p className="text-muted-foreground text-sm">
            Your photo, banner, name, and bio — what visitors see first.{" "}
            {manual ? "Publish to make changes live." : "Changes save as you type."}
          </p>
        </div>
        {manual && (dirty || history.canUndo || history.canRedo) ? (
          <PublishControls
            canUndo={history.canUndo}
            canRedo={history.canRedo}
            onUndo={onUndo}
            onRedo={onRedo}
            onPublish={onPublish}
            publishDisabled={!dirty}
            publishing={publish.isPending}
          />
        ) : null}
      </div>

      <div className="bg-card flex flex-col gap-6 rounded-2xl border p-4 sm:p-5">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">Banner</p>
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  onClick={() => bannerInputRef.current?.click()}
                  className="group relative block h-28 w-full overflow-hidden rounded-xl text-left sm:h-32"
                  aria-label="Change banner"
                >
                  {bannerSrc ? (
                    <Image
                      unoptimized
                      src={bannerSrc}
                      alt=""
                      fill
                      sizes="(max-width: 672px) 100vw, 640px"
                      className="outline-foreground/10 rounded-xl object-cover outline-1"
                    />
                  ) : (
                    <span className="bg-muted flex h-full items-center justify-center rounded-xl">
                      <ImageIcon className="text-muted-foreground size-5" />
                    </span>
                  )}
                  {upload.isPending && upload.variables?.target === "banner" && (
                    <span className="bg-background/60 absolute inset-0 grid place-items-center rounded-xl">
                      <Spinner />
                    </span>
                  )}
                </button>
              }
            />
            <TooltipContent>Change banner</TooltipContent>
          </Tooltip>
          <input
            ref={bannerInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            data-target="banner"
            className="hidden"
            onChange={onPickImage}
          />
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">Photo</p>
          <div className="flex items-center gap-4">
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    className="group relative block size-16 shrink-0"
                    aria-label="Change profile photo"
                  >
                    <Avatar className="outline-foreground/10 size-16 outline-1">
                      {avatarSrc ? <AvatarImage src={avatarSrc} alt="" /> : null}
                      <AvatarFallback className="text-lg font-medium">
                        {fallback}
                      </AvatarFallback>
                    </Avatar>
                    {upload.isPending && upload.variables?.target === "avatar" ? (
                      <span className="bg-background/60 absolute inset-0 grid place-items-center rounded-full">
                        <Spinner />
                      </span>
                    ) : (
                      <span className="bg-secondary border-background absolute -right-0.5 -bottom-0.5 flex size-6 items-center justify-center rounded-full border shadow-sm">
                        <CameraIcon className="size-3.5" />
                      </span>
                    )}
                  </button>
                }
              />
              <TooltipContent>Change photo</TooltipContent>
            </Tooltip>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              data-target="avatar"
              className="hidden"
              onChange={onPickImage}
            />
          </div>
        </div>

        <form.Field name="headerStyle">
          {(field) => (
            <Field>
              <FieldLabel id="header-style-label">Header style</FieldLabel>
              <ScrollArea className="scroll-fade-10 **:data-[slot=scroll-area-viewport]:scroll-fade-x px-2">
                <div className="mb-4 flex w-max snap-x gap-2 p-0.5">
                  {(
                    [
                      "classic",
                      "hero",
                      "banner",
                      "cutout",
                      "minimal",
                      "left",
                      "statement",
                    ] as const
                  ).map((value) => (
                    <label
                      key={value}
                      className={cn(
                        "relative flex w-32 shrink-0 snap-start flex-col items-stretch gap-2 rounded-xl border p-2 pb-6 text-sm has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/30",
                        field.state.value === value
                          ? "border-ring ring-ring/30 ring-3"
                          : "border-input",
                      )}
                    >
                      <input
                        type="radio"
                        name="header-style"
                        value={value}
                        checked={field.state.value === value}
                        onChange={() => {
                          field.handleChange(value);
                          if (manual) {
                            const next: ProfileDraftFields = {
                              displayName: history.present.displayName,
                              bio: history.present.bio,
                              headerStyle: value,
                              avatarPath: history.present.avatarPath,
                              bannerPath: history.present.bannerPath,
                            };
                            history.push(next);
                            setProfileDraft?.(next);
                            saveDraft.mutate(next);
                          }
                        }}
                        className="sr-only"
                      />
                      <HeaderStyleMock value={value} />
                      <span className="text-muted-foreground absolute inset-x-0 bottom-0.5 text-center text-xs capitalize">
                        {value}
                      </span>
                    </label>
                  ))}
                </div>
                <ScrollBar
                  orientation="horizontal"
                  className="opacity-0 transition-opacity duration-200 focus-within:opacity-100 hover:opacity-100 data-[hovering]:opacity-100 data-[scrolling]:opacity-100"
                />
              </ScrollArea>
            </Field>
          )}
        </form.Field>

        <form.Field name="displayName">
          {(field) => {
            const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>Name</FieldLabel>
                <Input
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                  aria-invalid={isInvalid}
                  autoComplete="off"
                  placeholder="Your name"
                />
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            );
          }}
        </form.Field>

        <form.Field name="bio">
          {(field) => {
            const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>Bio</FieldLabel>
                <Textarea
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                  aria-invalid={isInvalid}
                  placeholder="A sentence about you."
                  rows={3}
                  className="resize-y"
                />
                <div className="flex items-center justify-between gap-2">
                  <span className="min-w-0">
                    {isInvalid && <FieldError errors={field.state.meta.errors} />}
                  </span>
                  <span className="text-muted-foreground shrink-0 text-xs">
                    {field.state.value.length}/200
                  </span>
                </div>
              </Field>
            );
          }}
        </form.Field>
      </div>
    </div>
  );
}

function HeaderStyleMock({ value }: { value: string }) {
  if (value === "statement") {
    return (
      <span className="flex h-14 w-full flex-col justify-center gap-1.5 rounded-md border p-2">
        <span className="bg-muted-foreground/30 h-2 w-full rounded-full" />
        <span className="bg-muted-foreground/30 h-2 w-4/5 rounded-full" />
        <span className="bg-muted-foreground/20 h-1 w-1/2 rounded-full" />
      </span>
    );
  }
  if (value === "minimal") {
    return (
      <span className="flex h-14 w-full flex-col items-center justify-center gap-1.5 rounded-md border p-2">
        <span className="bg-muted-foreground/30 h-1.5 w-1/2 rounded-full" />
        <span className="bg-muted-foreground/20 h-1 w-2/3 rounded-full" />
      </span>
    );
  }
  if (value === "left") {
    return (
      <span className="flex h-14 w-full flex-col justify-center gap-1.5 rounded-md border p-2">
        <span className="bg-muted-foreground/30 h-1.5 w-1/2 rounded-full" />
        <span className="bg-muted-foreground/20 h-1 w-3/4 rounded-full" />
        <span className="bg-muted-foreground/20 h-1 w-1/3 rounded-full" />
      </span>
    );
  }
  if (value === "cutout") {
    return (
      <span className="flex h-14 w-full flex-col items-center gap-1.5 rounded-md border p-2">
        <span className="bg-muted h-8 w-3/4 rounded-xl" />
        <span className="bg-muted-foreground/20 h-1 w-1/2 rounded-full" />
      </span>
    );
  }
  if (value === "hero") {
    return (
      <span className="flex h-14 w-full flex-col gap-1.5 rounded-md border p-2">
        <span className="bg-muted h-9 w-full rounded-md" />
        <span className="bg-muted-foreground/20 h-1 w-1/2 self-center rounded-full" />
      </span>
    );
  }
  if (value === "banner") {
    return (
      <span className="flex h-14 w-full flex-col items-center gap-1.5 rounded-md border p-2">
        <span className="bg-muted h-4 w-full rounded-md" />
        <span className="bg-muted-foreground/30 border-background -mt-1 size-4 rounded-full border-2" />
        <span className="bg-muted-foreground/20 h-1 w-1/2 rounded-full" />
      </span>
    );
  }
  return (
    <span className="flex h-14 w-full flex-col items-center gap-1.5 rounded-md border p-2">
      <span className="bg-muted-foreground/30 size-4 rounded-full" />
      <span className="bg-muted-foreground/20 h-1 w-1/2 rounded-full" />
      <span className="bg-muted-foreground/20 h-1 w-1/3 rounded-full" />
    </span>
  );
}

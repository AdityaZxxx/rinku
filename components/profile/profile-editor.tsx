"use client";

import { useEffect, useRef, useState } from "react";
import type { Profile } from "@/lib/db/schema";
import { CameraIcon } from "@phosphor-icons/react";
import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { isEditableTarget } from "@/lib/dashboard/keyboard";
import {
  profileDraftFromProfile,
  type ProfileDraftFields,
} from "@/lib/profiles/editor-draft";
import { profileInitials } from "@/lib/profiles/initials";
import { imageMaxBytes, profileBasicsSchema } from "@/lib/profiles/schema";
import { avatarUrl } from "@/lib/supabase/storage";
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
          // The avatar path is owned by uploads, not the text form; carry the
          // staged one.
          avatarPath: history.present.avatarPath,
        };
        if (manual) {
          if (JSON.stringify(next) !== JSON.stringify(history.present)) {
            // One coalesced entry per burst of typing in the same field.
            history.push(next, "profile-text");
            setProfileDraft?.(next);
            saveDraft.mutate(next);
          }
          return;
        }
        update.mutate(formApi.state.values);
      },
      onChangeDebounceMs: 800,
    },
  });

  // Undo/redo rewrite the draft and the form. The form reset is what makes the
  // text fields visibly rewind.
  function applyHistory(next: ProfileDraftFields) {
    form.reset({
      displayName: next.displayName,
      bio: next.bio,
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

  useEffect(() => {
    if (!manual) {
      return;
    }
    const handler = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "z") {
        return;
      }
      // Inside a field, ⌘Z means native text undo; only hijack it elsewhere.
      if (isEditableTarget(event.target)) {
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
    if (!file || target !== "avatar") {
      return;
    }
    if (file.size === 0 || file.size > imageMaxBytes.avatar) {
      toast.error(
        `Upload a JPEG, PNG, WebP, or AVIF image up to ${imageMaxBytes.avatar / (1024 * 1024)} MB.`,
      );
      return;
    }
    upload.mutate(
      { profileId: profile.id, file },
      manual
        ? {
            onSuccess: (result) => {
              const next: ProfileDraftFields = {
                ...history.present,
                avatarPath: result.path,
              };
              history.push(next);
              setProfileDraft?.(next);
              saveDraft.mutate(next);
            },
          }
        : undefined,
    );
  }

  // Manual mode shows the staged path (an upload lands on the draft, not the
  // live row); auto mode shows the published one.
  const shownAvatarPath = manual ? history.present.avatarPath : profile.avatarPath;
  const avatarSrc = shownAvatarPath ? avatarUrl(shownAvatarPath) : null;
  const fallback = profileInitials(profile.displayName, username);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-lg font-medium">Profile</h1>
          <p className="text-muted-foreground text-sm">
            Your photo, name, and bio: what visitors see first.{" "}
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
                    {upload.isPending ? (
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
                    {[...field.state.value].length}/150
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

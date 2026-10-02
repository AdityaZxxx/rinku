"use client";

import { useRef } from "react";
import Image from "next/image";
import type { Profile } from "@/lib/db/schema";
import { CameraIcon, ImageIcon } from "@phosphor-icons/react";
import { useForm } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { getProfile } from "@/app/actions/profiles";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { imageMaxBytes, profileBasicsSchema } from "@/lib/profiles";
import { avatarUrl, bannerUrl } from "@/lib/storage";
import { useUpdateProfile, useUploadProfileImage } from "./use-profile-mutations";

export function ProfileEditor({
  username,
  initialProfile,
}: {
  username: string;
  initialProfile: Profile;
}) {
  const update = useUpdateProfile(username);
  const upload = useUploadProfileImage(username);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const query = useQuery({
    queryKey: ["profile", username],
    queryFn: async () => {
      const result = await getProfile({ username });
      if ("error" in result) {
        throw new Error(result.error);
      }
      return result;
    },
    initialData: initialProfile,
  });
  const profile = query.data && !("error" in query.data) ? query.data : initialProfile;

  const form = useForm({
    defaultValues: {
      displayName: profile.displayName ?? "",
      bio: profile.bio ?? "",
    },
    validators: { onChange: profileBasicsSchema },
    listeners: {
      onChange: ({ formApi }) => {
        if (!formApi.state.isValid) {
          return;
        }
        update.mutate(formApi.state.values);
      },
      onChangeDebounceMs: 800,
    },
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
    upload.mutate({ profileId: profile.id, file, target });
  }

  const avatarSrc = profile.avatarPath ? avatarUrl(profile.avatarPath) : null;
  const bannerSrc = profile.bannerPath ? bannerUrl(profile.bannerPath) : null;
  const fallback = (profile.displayName ?? username)[0]?.toUpperCase();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-lg font-medium">Profile</h1>
        <p className="text-muted-foreground text-sm">
          Your photo, banner, name, and bio — what visitors see first. Changes save as you
          type.
        </p>
      </div>

      {query.isError && (
        <output className="text-destructive text-sm">{query.error.message}</output>
      )}

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

"use client";

import { useEffect, useRef, useState } from "react";
import type { Profile } from "@/lib/db/schema";
import { ImageIcon, VideoCameraIcon, XIcon, CheckIcon } from "@phosphor-icons/react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  ColorField,
  SliderField,
  spacingLabel,
  thicknessLabel,
} from "@/components/appearance/appearance-fields";
import {
  AlignmentMock,
  ContourMock,
  EntranceMock,
  HeaderMock,
  HoverMock,
  KindMock,
  OptionTile,
  UmbraMock,
  VariantMock,
  WallpaperKindTile,
} from "@/components/appearance/appearance-mocks";
import { useSetAppearanceScrub } from "@/components/appearance/appearance-scrub-context";
import { AllFontsStylesheet } from "@/components/appearance/font-stylesheet";
import { useEditorDraft } from "@/components/profile/editor-draft-context";
import { PublishControls } from "@/components/profile/publish-controls";
import { useUnsavedChangesWarning } from "@/components/profile/unsaved-guard";
import {
  useDraftDirty,
  usePublishAppearanceSection,
  useSaveAppearanceDraft,
} from "@/components/profile/use-draft-mutations";
import { useProfileQuery } from "@/components/profile/use-profile-query";
import { useUndoRedo } from "@/components/profile/use-undo-redo";
import {
  Attachment,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
} from "@/components/ui/attachment";
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
import { Spinner } from "@/components/ui/spinner";
import { isEditableTarget } from "@/lib/dashboard/keyboard";
import {
  buttonBodyStyle,
  buttonContours,
  buttonUmbrae,
  buttonVariants,
  fontStack,
  fonts,
  linkEntrances,
  linkHovers,
  pageAlignments,
  patternSpacingRange,
  patternThicknessRange,
  resolveAppearance,
  wallpaperKinds,
  wallpaperPatterns,
  type Appearance,
  type PresetThemeId,
} from "@/lib/profiles/appearance";
import { presetThemes, themePresetValues } from "@/lib/profiles/appearance-presets";
import {
  appearanceDraftFromProfile,
  type AppearanceDraftFields,
} from "@/lib/profiles/editor-draft";
import { headerStyleIds, imageMaxBytes } from "@/lib/profiles/schema";
import { wallpaperUrl, bannerUrl } from "@/lib/supabase/storage";
import { cn } from "@/lib/utils";
import {
  useRemoveBanner,
  useRemoveWallpaperMedia,
  useUpdateAppearance,
  useUploadBanner,
  useUploadWallpaper,
} from "./use-appearance-mutations";

function appearanceFromProfile(profile: Profile): Appearance {
  const resolved = resolveAppearance(profile);
  return {
    themeId: resolved.themeId,
    headerStyle: resolved.headerStyle,
    bannerPath: resolved.bannerPath,
    buttonContour: resolved.buttonContour,
    buttonVariant: resolved.buttonVariant,
    buttonUmbra: resolved.buttonUmbra,
    buttonUmbraColor: resolved.buttonUmbraColor,
    buttonColor: resolved.buttonColor,
    buttonTextColor: resolved.buttonTextColor,
    fontId: resolved.fontId,
    titleColor: resolved.titleColor,
    bodyColor: resolved.bodyColor,
    wallpaperKind: resolved.wallpaperKind,
    wallpaperColor: resolved.wallpaperColor,
    wallpaperColorB: resolved.wallpaperColorB,
    wallpaperPattern: resolved.wallpaperPattern,
    wallpaperPatternSpacing: resolved.wallpaperPatternSpacing,
    wallpaperPatternThickness: resolved.wallpaperPatternThickness,
    linkEntrance: resolved.linkEntrance,
    linkHover: resolved.linkHover,
    pageAlignment: resolved.pageAlignment,
    wallpaperImagePath: resolved.wallpaperImagePath,
    wallpaperVideoPath: resolved.wallpaperVideoPath,
  };
}

export function AppearanceEditor({
  username,
  initialProfile,
  mode,
  initialDraft,
}: {
  username: string;
  initialProfile: Profile;
  mode: "auto" | "manual";
  initialDraft: AppearanceDraftFields | null;
}) {
  const manual = mode === "manual";
  const queryClient = useQueryClient();
  const update = useUpdateAppearance(username);
  const saveDraft = useSaveAppearanceDraft(username, initialProfile.id);
  const publish = usePublishAppearanceSection(username, initialProfile.id);
  const { setAppearanceDraft } = useEditorDraft() ?? {};
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const commitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { profile } = useProfileQuery(username, initialProfile);

  // Manual mode edits a draft seeded from the pending row if there is one,
  // otherwise the published appearance. Auto mode edits the profile directly.
  // Baseline is state so publishing can advance it without a remount.
  const [baseline, setBaseline] = useState<Appearance>(() =>
    manual
      ? (initialDraft ?? appearanceDraftFromProfile(profile))
      : appearanceFromProfile(profile),
  );
  const history = useUndoRedo<Appearance>(baseline);
  const [values, setValues] = useState<Appearance>(() =>
    manual ? baseline : appearanceFromProfile(profile),
  );
  const dirty = manual && JSON.stringify(history.present) !== JSON.stringify(baseline);
  useDraftDirty(history.present, baseline);
  useUnsavedChangesWarning();
  const [fontOpen, setFontOpen] = useState(false);
  const [fontQuery, setFontQuery] = useState("");
  const [uploadDialog, setUploadDialog] = useState<"image" | "video" | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [draggingFile, setDraggingFile] = useState(false);
  const imagePreviewUrl = imageFile ? URL.createObjectURL(imageFile) : null;
  const videoPreviewUrl = videoFile ? URL.createObjectURL(videoFile) : null;
  useEffect(() => {
    return () => {
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
      if (videoPreviewUrl) {
        URL.revokeObjectURL(videoPreviewUrl);
      }
    };
  }, [imagePreviewUrl, videoPreviewUrl]);
  const visibleFonts = fonts.filter((font) =>
    `${font.label} ${font.sample}`.toLowerCase().includes(fontQuery.trim().toLowerCase()),
  );

  useEffect(() => {
    return () => {
      if (commitTimer.current) {
        clearTimeout(commitTimer.current);
      }
    };
  }, []);

  function scheduleCommit(next: Appearance) {
    if (commitTimer.current) {
      clearTimeout(commitTimer.current);
    }
    commitTimer.current = setTimeout(() => {
      if (manual) {
        saveDraft.mutate(next);
      } else {
        update.mutate(next);
      }
    }, 600);
  }

  /** Sets the visible value and records one history step under `key`. */
  function applyValues(next: Appearance, key?: string) {
    if (manual) {
      history.push(next, key);
      setAppearanceDraft?.(next);
    } else {
      queryClient.setQueryData<Profile>(["profile", username], (old) =>
        old ? { ...old, ...next, updatedAt: new Date() } : old,
      );
    }
    setValues(next);
    scheduleCommit(next);
  }

  function tweak(patchValues: Partial<Appearance>, key?: string) {
    const next: Appearance = { ...values, ...patchValues, themeId: "custom" };
    applyValues(next, key);
  }

  // Hover-scrub: pointing at a picker tile publishes a transient appearance on
  // the scrub channel, which only the device previews read. The form, the
  // profile query, and the draft stay untouched, so a scrub re-renders nothing
  // beyond the preview, however heavy the themed page is. Real pointers only;
  // taps keep selecting exactly as before.
  const setScrub = useSetAppearanceScrub();
  const canScrub =
    typeof window !== "undefined" &&
    window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  function scrubTile(patch: Partial<Appearance>) {
    if (!canScrub) {
      return;
    }
    setScrub({ ...values, ...patch });
  }

  function scrubEnd() {
    setScrub(null);
  }

  // A theme restyles the page; it does not delete uploaded media or walk the
  // header back. Keeping both means the image/video tiles still find their
  // files when the user returns, and the header choice survives the switch.
  // The same merge previews a theme while scrubbing.
  function themeMerge(id: PresetThemeId): Appearance {
    return {
      ...themePresetValues[id],
      headerStyle: values.headerStyle,
      bannerPath: values.bannerPath,
      wallpaperImagePath: values.wallpaperImagePath,
      wallpaperVideoPath: values.wallpaperVideoPath,
    };
  }

  function applyPreset(id: PresetThemeId) {
    if (commitTimer.current) {
      clearTimeout(commitTimer.current);
    }
    applyValues(themeMerge(id));
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

  function applyHistory(next: Appearance) {
    setValues(next);
    setAppearanceDraft?.(next);
    scheduleCommit(next);
  }

  function onPublish() {
    publish.mutate(undefined, {
      onSuccess: () => {
        setBaseline(history.present);
        history.reset(history.present);
        setAppearanceDraft?.(null);
      },
    });
  }

  // Uploads keep their immediate server side effect (the file is written and
  // the live path updated); the resulting value is then folded into the draft
  // so the preview reflects it. Deferred uploads are a later pass.
  const upload = useUploadWallpaper(username, {
    onDone: (kind, path) => {
      const prev = history.present;
      applyValues({
        ...prev,
        themeId: "custom",
        wallpaperKind: kind,
        wallpaperImagePath: kind === "image" ? path : prev.wallpaperImagePath,
        wallpaperVideoPath: kind === "video" ? path : prev.wallpaperVideoPath,
      });
      setUploadDialog(null);
      if (kind === "image") {
        setImageFile(null);
      } else {
        setVideoFile(null);
      }
    },
  });
  const removeMedia = useRemoveWallpaperMedia(username, {
    onDone: (target) => {
      const prev = history.present;
      applyValues({
        ...prev,
        themeId: "custom",
        wallpaperKind: "fill",
        wallpaperImagePath: target === "wallpaper-image" ? null : prev.wallpaperImagePath,
        wallpaperVideoPath: target === "wallpaper-video" ? null : prev.wallpaperVideoPath,
      });
    },
  });

  // Banner media follows the wallpaper pattern: the action carries the server
  // side effect, and the resulting path folds into the draft so the preview
  // reflects it. It never flips themeId: a theme does not own the banner.
  const uploadBannerMedia = useUploadBanner(username, {
    onDone: (path) => {
      const prev = history.present;
      applyValues({ ...prev, bannerPath: path });
    },
  });
  const removeBannerMedia = useRemoveBanner(username, {
    onDone: () => {
      const prev = history.present;
      applyValues({ ...prev, bannerPath: null });
    },
  });

  function onPickBannerFile(event: React.ChangeEvent<HTMLInputElement>) {
    const input = event.target;
    const file = input.files?.[0];
    input.value = "";
    if (!file) {
      return;
    }
    const maxBytes = imageMaxBytes.banner;
    if (file.size === 0 || !file.type.startsWith("image/") || file.size > maxBytes) {
      toast.error(
        `Upload a JPEG, PNG, WebP, or AVIF image up to ${maxBytes / (1024 * 1024)} MB.`,
      );
      return;
    }
    uploadBannerMedia.mutate({ profileId: profile.id, file });
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

  function acceptSelectedFile(
    target: "wallpaper-image" | "wallpaper-video",
    file: File | undefined,
  ) {
    if (!file || (target !== "wallpaper-image" && target !== "wallpaper-video")) {
      return;
    }
    const isVideo = target === "wallpaper-video";
    const maxBytes = isVideo
      ? imageMaxBytes.wallpaperVideo
      : imageMaxBytes.wallpaperImage;
    const validType = isVideo
      ? file.type === "video/mp4" || file.type === "video/webm"
      : file.type.startsWith("image/");
    if (file.size === 0 || !validType || file.size > maxBytes) {
      toast.error(
        isVideo
          ? `Upload an MP4 or WebM video up to ${maxBytes / (1024 * 1024)} MB.`
          : `Upload a JPEG, PNG, WebP, or AVIF image up to ${maxBytes / (1024 * 1024)} MB.`,
      );
      return;
    }
    if (isVideo) {
      setVideoFile(file);
    } else {
      setImageFile(file);
    }
  }

  function onPickFile(event: React.ChangeEvent<HTMLInputElement>) {
    const input = event.target;
    const file = input.files?.[0];
    const rawTarget = input.dataset.target;
    input.value = "";
    // SAFETY: the data-target attribute is only ever set by this file's own
    // hidden inputs, so an unmatched string can only be a bug here, not user data.
    if (rawTarget === "wallpaper-image" || rawTarget === "wallpaper-video") {
      acceptSelectedFile(rawTarget, file);
    }
  }

  function onDropFile(event: React.DragEvent<HTMLElement>) {
    event.preventDefault();
    setDraggingFile(false);
    const target = uploadDialog === "video" ? "wallpaper-video" : "wallpaper-image";
    acceptSelectedFile(target, event.dataTransfer.files?.[0]);
  }

  function onDragOver(event: React.DragEvent<HTMLElement>) {
    event.preventDefault();
    setDraggingFile(true);
  }

  function onDragLeave() {
    setDraggingFile(false);
  }

  function startUpload(target: "wallpaper-image" | "wallpaper-video", file: File | null) {
    if (!file) {
      return;
    }
    upload.mutate({ profileId: profile.id, file, target });
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-lg font-medium">Appearance</h1>
          <p className="text-muted-foreground text-sm">
            Themes, page background, buttons, and text.{" "}
            {manual ? "Publish to make changes live." : "Changes save automatically."}
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

      <div className="bg-card flex flex-col gap-2 rounded-2xl border p-4 sm:p-5">
        <Field>
          <FieldLabel id="theme-label">Theme</FieldLabel>
          <div
            role="radiogroup"
            aria-labelledby="theme-label"
            className="grid grid-cols-3 gap-2 sm:grid-cols-4"
          >
            {presetThemes.map((theme) => {
              const bar = buttonBodyStyle({
                color: theme.values.buttonColor,
                textColor: theme.values.buttonTextColor,
                variant: theme.values.buttonVariant,
                umbra: "none",
                edge: theme.values.buttonUmbraColor,
              });
              return (
                <OptionTile
                  key={theme.id}
                  name="theme"
                  value={theme.id}
                  label={theme.label}
                  checked={values.themeId === theme.id}
                  onSelect={() => applyPreset(theme.id)}
                  onScrub={() => scrubTile(themeMerge(theme.id))}
                  onScrubEnd={scrubEnd}
                >
                  <span
                    className="flex h-14 w-full flex-col items-center justify-center gap-1 rounded-md border p-2"
                    style={{ background: theme.swatch }}
                  >
                    <span className="h-2 w-1/2 rounded-full border" style={bar} />
                    <span className="h-2 w-1/3 rounded-full border" style={bar} />
                  </span>
                </OptionTile>
              );
            })}
          </div>
          {values.themeId === "custom" ? (
            <p className="text-muted-foreground mt-2 text-xs">
              Customized: pick a theme to start over.
            </p>
          ) : null}
        </Field>
      </div>

      <div className="bg-card flex flex-col gap-6 rounded-2xl border p-4 sm:p-5">
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
                <HeaderMock value={value} look={values} />
              </OptionTile>
            ))}
          </div>
        </Field>

        {values.headerStyle === "banner" ? (
          <div className="flex items-center gap-3 rounded-xl border px-3 py-2">
            {values.bannerPath ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={bannerUrl(values.bannerPath)}
                  alt=""
                  className="size-12 shrink-0 rounded-lg object-cover"
                />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="text-sm font-medium">Banner image</span>
                  <span className="text-muted-foreground text-xs">
                    Fades into the page behind your photo.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => bannerInputRef.current?.click()}
                  className="text-muted-foreground hover:text-foreground text-xs underline"
                >
                  Replace
                </button>
                <button
                  type="button"
                  aria-label="Remove banner image"
                  onClick={() =>
                    removeBannerMedia.mutate({
                      profileId: profile.id,
                    })
                  }
                  className="text-muted-foreground hover:text-foreground inline-flex size-8 items-center justify-center rounded-full"
                >
                  {removeBannerMedia.isPending ? (
                    <Spinner />
                  ) : (
                    <XIcon className="size-4" />
                  )}
                </button>
              </>
            ) : (
              <>
                <span className="bg-muted flex size-12 shrink-0 items-center justify-center rounded-lg">
                  {uploadBannerMedia.isPending ? (
                    <Spinner />
                  ) : (
                    <ImageIcon className="text-muted-foreground size-5" />
                  )}
                </span>
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="text-sm font-medium">Banner image</span>
                  <span className="text-muted-foreground text-xs">
                    No banner yet: choose one to upload.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => bannerInputRef.current?.click()}
                  className="text-xs font-medium underline"
                >
                  Choose file
                </button>
              </>
            )}
          </div>
        ) : null}
        <input
          ref={bannerInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          className="hidden"
          onChange={onPickBannerFile}
        />

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
                <AlignmentMock alignment={alignment.id} look={values} />
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
                <EntranceMock id={entrance.id} look={values} />
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
                <HoverMock id={hover.id} look={values} />
              </OptionTile>
            ))}
          </div>
        </Field>
      </div>

      <div className="bg-card flex flex-col gap-6 rounded-2xl border p-4 sm:p-5">
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
                    setUploadDialog("image");
                    tweak({ wallpaperKind: "image" });
                  } else if (kind.id === "video") {
                    setUploadDialog("video");
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
              onPreview={(wallpaperColorB) =>
                tweak({ wallpaperColorB }, "wallpaperColorB")
              }
              onCommit={(wallpaperColorB) =>
                tweak({ wallpaperColorB }, "wallpaperColorB")
              }
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

        {values.wallpaperKind === "image" ? (
          <div className="flex items-center gap-3 rounded-xl border px-3 py-2">
            {values.wallpaperImagePath ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={wallpaperUrl(values.wallpaperImagePath)}
                  alt=""
                  className="size-12 rounded-lg object-cover"
                />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="text-sm font-medium">Background image</span>
                  <span className="text-muted-foreground text-xs">
                    Covers the whole page.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setUploadDialog("image")}
                  className="text-muted-foreground hover:text-foreground text-xs underline"
                >
                  Replace
                </button>
                <button
                  type="button"
                  aria-label="Remove background image"
                  onClick={() =>
                    removeMedia.mutate({
                      profileId: profile.id,
                      target: "wallpaper-image",
                    })
                  }
                  className="text-muted-foreground hover:text-foreground inline-flex size-8 items-center justify-center rounded-full"
                >
                  {removeMedia.isPending ? <Spinner /> : <XIcon className="size-4" />}
                </button>
              </>
            ) : (
              <>
                <span className="bg-muted flex size-12 shrink-0 items-center justify-center rounded-lg">
                  {upload.isPending && upload.variables?.target === "wallpaper-image" ? (
                    <Spinner />
                  ) : (
                    <ImageIcon className="text-muted-foreground size-5" />
                  )}
                </span>
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="text-sm font-medium">Background image</span>
                  <span className="text-muted-foreground text-xs">
                    No image yet: choose one to upload.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setUploadDialog("image")}
                  className="text-xs font-medium underline"
                >
                  Choose file
                </button>
              </>
            )}
          </div>
        ) : null}

        {values.wallpaperKind === "video" ? (
          <div className="flex items-center gap-3 rounded-xl border px-3 py-2">
            {values.wallpaperVideoPath ? (
              <>
                <span className="bg-muted flex size-12 shrink-0 items-center justify-center rounded-lg">
                  <VideoCameraIcon className="text-muted-foreground size-5" />
                </span>
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="text-sm font-medium">Background video</span>
                  <span className="text-muted-foreground text-xs">
                    Loops silently behind your page.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setUploadDialog("video")}
                  className="text-muted-foreground hover:text-foreground text-xs underline"
                >
                  Replace
                </button>
                <button
                  type="button"
                  aria-label="Remove background video"
                  onClick={() =>
                    removeMedia.mutate({
                      profileId: profile.id,
                      target: "wallpaper-video",
                    })
                  }
                  className="text-muted-foreground hover:text-foreground inline-flex size-8 items-center justify-center rounded-full"
                >
                  {removeMedia.isPending ? <Spinner /> : <XIcon className="size-4" />}
                </button>
              </>
            ) : (
              <>
                <span className="bg-muted flex size-12 shrink-0 items-center justify-center rounded-lg">
                  {upload.isPending && upload.variables?.target === "wallpaper-video" ? (
                    <Spinner />
                  ) : (
                    <VideoCameraIcon className="text-muted-foreground size-5" />
                  )}
                </span>
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="text-sm font-medium">Background video</span>
                  <span className="text-muted-foreground text-xs">
                    No video yet: choose one to upload.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setUploadDialog("video")}
                  className="text-xs font-medium underline"
                >
                  Choose file
                </button>
              </>
            )}
          </div>
        ) : null}
      </div>

      <Dialog
        open={uploadDialog !== null}
        onOpenChange={(open) => {
          if (!open) {
            setUploadDialog(null);
            setImageFile(null);
            setVideoFile(null);
            setDraggingFile(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {uploadDialog === "video"
                ? "Upload a background video"
                : "Upload a background image"}
            </DialogTitle>
            <DialogDescription>
              {uploadDialog === "video"
                ? "MP4 or WebM up to 25 MB. Loops silently behind your page."
                : "JPEG, PNG, WebP, or AVIF up to 5 MB. Covers the whole page."}
            </DialogDescription>
          </DialogHeader>

          <button
            type="button"
            onClick={() => {
              const input =
                uploadDialog === "video" ? videoInputRef.current : imageInputRef.current;
              input?.click();
            }}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDropFile}
            className={cn(
              "border-input bg-muted/30 flex min-h-24 w-full flex-col items-center justify-center gap-1 rounded-2xl border border-dashed px-4 py-3 text-center transition",
              draggingFile && "ring-ring/40 ring-2",
            )}
          >
            <span className="text-sm font-medium">
              {uploadDialog === "video"
                ? "Drag and drop a video, or choose one"
                : "Drag and drop an image, or choose one"}
            </span>
            <span className="text-muted-foreground text-xs">
              {uploadDialog === "video"
                ? "MP4 or WebM, max 25 MB"
                : "JPEG, PNG, WebP, or AVIF, max 5 MB"}
            </span>
          </button>

          {(uploadDialog === "video" && videoFile) ||
          (uploadDialog === "image" && imageFile) ||
          upload.isPending ? (
            <Attachment
              state={
                upload.isPending
                  ? "uploading"
                  : (uploadDialog === "video" && videoFile) ||
                      (uploadDialog === "image" && imageFile)
                    ? "done"
                    : "idle"
              }
              className="w-full max-w-none"
            >
              <AttachmentMedia variant="image" className="size-14 rounded-xl">
                {uploadDialog === "image" && imageFile ? (
                  // eslint-disable-next-line @next/next/no-img-element -- local blob preview of the picked file, rendered once
                  <img
                    src={imagePreviewUrl ?? ""}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : uploadDialog === "video" && videoFile ? (
                  <video
                    src={videoPreviewUrl ?? ""}
                    muted
                    className="h-full w-full object-cover"
                  />
                ) : uploadDialog === "video" ? (
                  <VideoCameraIcon className="size-5" />
                ) : (
                  <ImageIcon className="size-5" />
                )}
              </AttachmentMedia>
              <AttachmentContent>
                <AttachmentTitle>
                  {uploadDialog === "video" ? videoFile?.name : imageFile?.name}
                </AttachmentTitle>
                <AttachmentDescription>
                  {uploadDialog === "video" && videoFile
                    ? `${(videoFile.size / (1024 * 1024)).toFixed(1)} MB`
                    : uploadDialog === "image" && imageFile
                      ? `${(imageFile.size / (1024 * 1024)).toFixed(1)} MB`
                      : null}
                </AttachmentDescription>
              </AttachmentContent>
            </Attachment>
          ) : null}

          <div className="flex items-center justify-end">
            <button
              type="button"
              disabled={
                (uploadDialog === "video" && !videoFile) ||
                (uploadDialog === "image" && !imageFile) ||
                upload.isPending
              }
              onClick={() =>
                startUpload(
                  uploadDialog === "video" ? "wallpaper-video" : "wallpaper-image",
                  uploadDialog === "video" ? videoFile : imageFile,
                )
              }
              className="bg-foreground text-background rounded-full px-4 py-1.5 text-xs font-medium disabled:opacity-50"
            >
              {upload.isPending ? <Spinner /> : "Upload"}
            </button>
          </div>

          <input
            ref={imageInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            data-target="wallpaper-image"
            className="hidden"
            onChange={onPickFile}
          />
          <input
            ref={videoInputRef}
            type="file"
            accept="video/mp4,video/webm"
            data-target="wallpaper-video"
            className="hidden"
            onChange={onPickFile}
          />
        </DialogContent>
      </Dialog>

      <div className="bg-card flex flex-col gap-6 rounded-2xl border p-4 sm:p-5">
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
            onCommit={(buttonUmbraColor) =>
              tweak({ buttonUmbraColor }, "buttonUmbraColor")
            }
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
      </div>

      <div className="bg-card flex flex-col gap-6 rounded-2xl border p-4 sm:p-5">
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
                  {fonts.find((font) => font.id === values.fontId)?.sample ??
                    "Modern sans"}
                </span>
              </span>
              <span className="text-muted-foreground text-xs underline">Change</span>
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
      </div>
    </div>
  );
}

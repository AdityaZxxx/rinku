"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { Profile } from "@/lib/db/schema";
import { ImageIcon, VideoCameraIcon, XIcon, CheckIcon } from "@phosphor-icons/react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { AllFontsStylesheet } from "@/components/appearance/font-stylesheet";
import { patternBackground } from "@/components/appearance/wallpaper-layer";
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
import { ColorPicker } from "@/components/ui/color-picker";
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
import {
  buttonContourClass,
  buttonContours,
  buttonUmbraBoxShadow,
  buttonUmbrae,
  buttonVariants,
  fontStack,
  fonts,
  presetThemes,
  resolveAppearance,
  themePresetValues,
  wallpaperKinds,
  wallpaperPatterns,
  type Appearance,
  type ButtonUmbra,
  type PresetThemeId,
  type WallpaperPattern,
} from "@/lib/appearance";
import {
  appearanceDraftFromProfile,
  type AppearanceDraftFields,
} from "@/lib/editor-draft";
import { imageMaxBytes } from "@/lib/profiles";
import { wallpaperUrl } from "@/lib/storage";
import { cn } from "@/lib/utils";
import {
  useRemoveWallpaperMedia,
  useUpdateAppearance,
  useUploadWallpaper,
} from "./use-appearance-mutations";

function appearanceFromProfile(profile: Profile): Appearance {
  const resolved = resolveAppearance(profile);
  return {
    themeId: resolved.themeId,
    buttonContour: resolved.buttonContour,
    buttonVariant: resolved.buttonVariant,
    buttonUmbra: resolved.buttonUmbra,
    buttonColor: resolved.buttonColor,
    buttonTextColor: resolved.buttonTextColor,
    fontId: resolved.fontId,
    titleColor: resolved.titleColor,
    bodyColor: resolved.bodyColor,
    wallpaperKind: resolved.wallpaperKind,
    wallpaperColor: resolved.wallpaperColor,
    wallpaperColorB: resolved.wallpaperColorB,
    wallpaperPattern: resolved.wallpaperPattern,
    wallpaperImagePath: resolved.wallpaperImagePath,
    wallpaperVideoPath: resolved.wallpaperVideoPath,
  };
}

function OptionTile({
  name,
  value,
  checked,
  onSelect,
  label,
  children,
}: {
  name: string;
  value: string;
  checked: boolean;
  onSelect: () => void;
  label: string;
  children: ReactNode;
}) {
  return (
    <label
      className={cn(
        "relative flex cursor-pointer flex-col items-stretch gap-2 rounded-xl border p-2 pb-6 text-sm has-focus-visible:ring-3 has-focus-visible:ring-ring/30",
        checked ? "border-ring ring-ring/30 ring-3" : "border-input",
      )}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onSelect}
        className="sr-only"
      />
      {children}
      <span className="text-muted-foreground absolute inset-x-0 bottom-0.5 text-center text-xs capitalize">
        {label}
      </span>
    </label>
  );
}

function WallpaperKindTile({
  kind,
  label,
  checked,
  color,
  colorB,
  onSelect,
}: {
  kind: "fill" | "gradient" | "blur" | "pattern" | "image" | "video";
  label: string;
  checked: boolean;
  color: string;
  colorB: string;
  onSelect: () => void;
}) {
  if (kind === "image" || kind === "video") {
    return (
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={checked}
        className={cn(
          "relative flex cursor-pointer flex-col items-stretch gap-2 rounded-xl border bg-transparent p-2 pb-6 text-left text-sm transition",
          checked ? "border-ring ring-ring/30 ring-3" : "border-input hover:bg-accent/40",
        )}
      >
        <KindMock kind={kind} color={color} colorB={colorB} />
        <span className="text-muted-foreground absolute inset-x-0 bottom-0.5 text-center text-xs capitalize">
          {label}
        </span>
      </button>
    );
  }
  return (
    <OptionTile
      name="wallpaper-kind"
      value={kind}
      label={label}
      checked={checked}
      onSelect={onSelect}
    >
      <KindMock kind={kind} color={color} colorB={colorB} />
    </OptionTile>
  );
}

function TileMock({ children }: { children: ReactNode }) {
  return (
    <span className="flex h-14 w-full items-center justify-center rounded-md border p-2">
      {children}
    </span>
  );
}

function VariantMock({ variant, color }: { variant: string; color: string }) {
  if (variant === "outline") {
    return (
      <TileMock>
        <span
          className="h-5 w-3/4 rounded-full border-2"
          style={{ borderColor: color }}
        />
      </TileMock>
    );
  }
  if (variant === "soft") {
    return (
      <TileMock>
        <span
          className="h-5 w-3/4 rounded-full"
          style={{ backgroundColor: `color-mix(in oklch, ${color} 18%, transparent)` }}
        />
      </TileMock>
    );
  }
  if (variant === "glass") {
    return (
      <TileMock>
        <span
          className="h-5 w-3/4 rounded-full border backdrop-blur-md"
          style={{
            backgroundColor: `color-mix(in oklch, ${color} 25%, transparent)`,
            borderColor: `color-mix(in oklch, ${color} 45%, transparent)`,
          }}
        />
      </TileMock>
    );
  }
  return (
    <TileMock>
      <span className="h-5 w-3/4 rounded-full" style={{ backgroundColor: color }} />
    </TileMock>
  );
}

function UmbraMock({ umbra, edge }: { umbra: ButtonUmbra; edge: string }) {
  return (
    <TileMock>
      <span
        className="bg-foreground h-5 w-3/4 rounded-full"
        style={{ boxShadow: buttonUmbraBoxShadow(umbra, edge) ?? undefined }}
      />
    </TileMock>
  );
}

function KindMock({
  kind,
  color,
  colorB,
  pattern = "dots",
}: {
  kind: string;
  color: string;
  colorB: string;
  pattern?: WallpaperPattern;
}) {
  if (kind === "gradient") {
    return (
      <TileMock>
        <span
          className="h-9 w-full rounded-md border"
          style={{ background: `linear-gradient(135deg, ${color}, ${colorB})` }}
        />
      </TileMock>
    );
  }
  if (kind === "blur") {
    return (
      <TileMock>
        <span
          className="relative h-9 w-full overflow-hidden rounded-md border"
          style={{ backgroundColor: color }}
        >
          <span
            className="absolute -top-2 -left-2 size-8 rounded-full blur-sm"
            style={{ backgroundColor: colorB }}
          />
          <span
            className="absolute -right-2 -bottom-2 size-8 rounded-full blur-sm"
            style={{ backgroundColor: colorB, opacity: 0.6 }}
          />
        </span>
      </TileMock>
    );
  }
  if (kind === "pattern") {
    return (
      <TileMock>
        <span
          className="h-9 w-full rounded-md border"
          style={{ background: patternBackground(pattern, color, colorB) }}
        />
      </TileMock>
    );
  }
  if (kind === "image") {
    return (
      <TileMock>
        <span className="flex h-9 w-full items-center justify-center rounded-md border">
          <ImageIcon className="text-muted-foreground size-5" />
        </span>
      </TileMock>
    );
  }
  if (kind === "video") {
    return (
      <TileMock>
        <span className="flex h-9 w-full items-center justify-center rounded-md border">
          <VideoCameraIcon className="text-muted-foreground size-5" />
        </span>
      </TileMock>
    );
  }
  return (
    <TileMock>
      <span className="h-9 w-full rounded-md border" style={{ backgroundColor: color }} />
    </TileMock>
  );
}

function ColorField({
  label,
  value,
  onPreview,
  onCommit,
}: {
  label: string;
  value: string;
  onPreview: (value: string) => void;
  onCommit: (value: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border px-3 py-2">
      <div className="flex min-w-0 flex-col">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-muted-foreground text-xs uppercase">{value}</span>
      </div>
      <ColorPicker value={value} onChange={onPreview} onCommit={onCommit} label={label} />
    </div>
  );
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

  function applyPreset(id: PresetThemeId) {
    if (commitTimer.current) {
      clearTimeout(commitTimer.current);
    }
    const next = themePresetValues[id];
    applyValues(next);
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
            className="grid grid-cols-3 gap-2"
          >
            {presetThemes.map((theme) => (
              <OptionTile
                key={theme.id}
                name="theme"
                value={theme.id}
                label={theme.label}
                checked={values.themeId === theme.id}
                onSelect={() => applyPreset(theme.id)}
              >
                <span
                  className="flex h-14 w-full flex-col items-center justify-center gap-1 rounded-md border p-2"
                  style={{ background: theme.swatch }}
                >
                  <span
                    className="h-2 w-1/2 rounded-full"
                    style={{ backgroundColor: theme.values.buttonColor }}
                  />
                  <span
                    className="h-2 w-1/3 rounded-full"
                    style={{ backgroundColor: theme.values.buttonColor }}
                  />
                </span>
              </OptionTile>
            ))}
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
            label="Background"
            value={values.wallpaperColor}
            onPreview={(wallpaperColor) => tweak({ wallpaperColor }, "wallpaperColor")}
            onCommit={(wallpaperColor) => tweak({ wallpaperColor }, "wallpaperColor")}
          />
          {values.wallpaperKind === "gradient" ||
          values.wallpaperKind === "blur" ||
          values.wallpaperKind === "pattern" ? (
            <ColorField
              label="Accent"
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
          <Field>
            <FieldLabel id="pattern-label">Pattern</FieldLabel>
            <div
              role="radiogroup"
              aria-labelledby="pattern-label"
              className="grid grid-cols-4 gap-2"
            >
              {wallpaperPatterns.map((pattern) => (
                <OptionTile
                  key={pattern.id}
                  name="wallpaper-pattern"
                  value={pattern.id}
                  label={pattern.label}
                  checked={values.wallpaperPattern === pattern.id}
                  onSelect={() => tweak({ wallpaperPattern: pattern.id })}
                >
                  <KindMock
                    kind="pattern"
                    color={values.wallpaperColor}
                    colorB={values.wallpaperColorB}
                    pattern={pattern.id}
                  />
                </OptionTile>
              ))}
            </div>
          </Field>
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
              >
                <VariantMock variant={variant.id} color={values.buttonColor} />
              </OptionTile>
            ))}
          </div>
        </Field>

        <Field>
          <FieldLabel id="corner-label">Corners</FieldLabel>
          <div
            role="radiogroup"
            aria-labelledby="corner-label"
            className="grid grid-cols-4 gap-2"
          >
            {buttonContours.map((contour) => (
              <OptionTile
                key={contour.id}
                name="button-contour"
                value={contour.id}
                label={contour.label}
                checked={values.buttonContour === contour.id}
                onSelect={() => tweak({ buttonContour: contour.id })}
              >
                <TileMock>
                  <span
                    className={cn(
                      "h-5 w-3/4 bg-foreground",
                      buttonContourClass(contour.id),
                    )}
                  />
                </TileMock>
              </OptionTile>
            ))}
          </div>
        </Field>

        <Field>
          <FieldLabel id="umbra-label">Shadow</FieldLabel>
          <div
            role="radiogroup"
            aria-labelledby="umbra-label"
            className="grid grid-cols-4 gap-2"
          >
            {buttonUmbrae.map((umbra) => (
              <OptionTile
                key={umbra.id}
                name="button-umbra"
                value={umbra.id}
                label={umbra.label}
                checked={values.buttonUmbra === umbra.id}
                onSelect={() => tweak({ buttonUmbra: umbra.id })}
              >
                <UmbraMock umbra={umbra.id} edge={values.titleColor} />
              </OptionTile>
            ))}
          </div>
        </Field>

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

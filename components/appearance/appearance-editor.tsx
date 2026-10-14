"use client";

import { useEffect, useRef, useState } from "react";
import type { Profile } from "@/lib/db/schema";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { ButtonSection } from "@/components/appearance/appearance-button-section";
import { FontSection } from "@/components/appearance/appearance-font-section";
import { HeaderSection } from "@/components/appearance/appearance-header-section";
import {
  BannerMediaRow,
  WallpaperMediaRow,
} from "@/components/appearance/appearance-media-rows";
import { useSetAppearanceScrub } from "@/components/appearance/appearance-scrub-context";
import { OptionTile } from "@/components/appearance/appearance-tiles";
import { AppearanceUploadDialog } from "@/components/appearance/appearance-upload-dialog";
import { WallpaperSection } from "@/components/appearance/appearance-wallpaper-section";
import { useEditorDraft } from "@/components/profile/editor-draft-context";
import { PublishControls } from "@/components/profile/publish-controls";
import {
  useUnsavedActions,
  useUnsavedChangesWarning,
} from "@/components/profile/unsaved-guard";
import {
  useDiscardAppearanceSection,
  useDraftDirty,
  usePublishAppearanceSection,
  useSaveAppearanceDraft,
} from "@/components/profile/use-draft-mutations";
import { useProfileQuery } from "@/components/profile/use-profile-query";
import { useUndoRedo } from "@/components/profile/use-undo-redo";
import { Field, FieldLabel } from "@/components/ui/field";
import { isEditableTarget } from "@/lib/dashboard/keyboard";
import {
  resolveAppearance,
  type Appearance,
  type PresetThemeId,
} from "@/lib/profiles/appearance";
import { buttonBodyStyle } from "@/lib/profiles/appearance-buttons";
import { presetThemes, themePresetValues } from "@/lib/profiles/appearance-presets";
import {
  appearanceDraftFromProfile,
  type AppearanceDraftFields,
} from "@/lib/profiles/editor-draft";
import { imageMaxBytes } from "@/lib/profiles/schema";
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
    showUsername: resolved.showUsername,
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
  const discard = useDiscardAppearanceSection(username, initialProfile.id);
  useUnsavedActions({
    save: async () => {
      await publish.mutateAsync();
    },
    discard: async () => {
      await discard.mutateAsync();
    },
  });
  const { setAppearanceDraft } = useEditorDraft() ?? {};
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
  const [uploadDialog, setUploadDialog] = useState<"image" | "video" | null>(null);

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
      showUsername: values.showUsername,
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

  function onDiscard() {
    // Optimistic: the editor rewinds at once and the draft row is deleted in
    // the background; a failed delete toasts, and the draft resurfaces on the
    // next visit.
    const published = appearanceFromProfile(profile);
    setBaseline(published);
    history.reset(published);
    setAppearanceDraft?.(null);
    discard.mutate();
  }

  // Uploads keep their immediate server side effect (the file is written and
  // the live path updated); the resulting value is then folded into the draft
  // so the preview reflects it. Deferred uploads are a later pass. The upload
  // mutation itself lives here so the media rows can read its pending state;
  // the upload dialog wires the per-upload side effects.
  const upload = useUploadWallpaper(username);
  function onWallpaperUploaded(kind: "image" | "video", path: string) {
    const prev = history.present;
    applyValues({
      ...prev,
      themeId: "custom",
      wallpaperKind: kind,
      wallpaperImagePath: kind === "image" ? path : prev.wallpaperImagePath,
      wallpaperVideoPath: kind === "video" ? path : prev.wallpaperVideoPath,
    });
  }
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

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-lg font-medium">Appearance</h1>
          <p className="text-muted-foreground text-sm">
            Themes, page background, buttons, and text.{" "}
            {manual ? "Save to make changes live." : "Changes save automatically."}
          </p>
        </div>
        {manual && (dirty || history.canUndo || history.canRedo) ? (
          <PublishControls
            canUndo={history.canUndo}
            canRedo={history.canRedo}
            onUndo={onUndo}
            onRedo={onRedo}
            onDiscard={onDiscard}
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
        <HeaderSection
          values={values}
          tweak={tweak}
          scrubTile={scrubTile}
          scrubEnd={scrubEnd}
          username={username}
          bannerSlot={
            values.headerStyle === "banner" ? (
              <BannerMediaRow
                bannerPath={values.bannerPath}
                profileId={profile.id}
                upload={uploadBannerMedia}
                remove={removeBannerMedia}
                inputRef={bannerInputRef}
                onPickFile={onPickBannerFile}
              />
            ) : null
          }
        />
      </div>

      <div className="bg-card flex flex-col gap-6 rounded-2xl border p-4 sm:p-5">
        <WallpaperSection
          values={values}
          tweak={tweak}
          scrubTile={scrubTile}
          scrubEnd={scrubEnd}
          onPickMedia={setUploadDialog}
        />
        {values.wallpaperKind === "image" ? (
          <WallpaperMediaRow
            kind="image"
            path={values.wallpaperImagePath}
            profileId={profile.id}
            upload={upload}
            remove={removeMedia}
            onPick={() => setUploadDialog("image")}
          />
        ) : null}
        {values.wallpaperKind === "video" ? (
          <WallpaperMediaRow
            kind="video"
            path={values.wallpaperVideoPath}
            profileId={profile.id}
            upload={upload}
            remove={removeMedia}
            onPick={() => setUploadDialog("video")}
          />
        ) : null}
      </div>

      <AppearanceUploadDialog
        profileId={profile.id}
        target={uploadDialog}
        onClose={() => setUploadDialog(null)}
        upload={upload}
        onUploaded={onWallpaperUploaded}
      />

      <div className="bg-card flex flex-col gap-6 rounded-2xl border p-4 sm:p-5">
        <ButtonSection
          values={values}
          tweak={tweak}
          scrubTile={scrubTile}
          scrubEnd={scrubEnd}
        />
      </div>

      <div className="bg-card flex flex-col gap-6 rounded-2xl border p-4 sm:p-5">
        <FontSection values={values} tweak={tweak} />
      </div>
    </div>
  );
}

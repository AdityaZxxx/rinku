"use client";

import type { RefObject } from "react";
import type {
  useRemoveBanner,
  useRemoveWallpaperMedia,
  useUploadBanner,
  useUploadWallpaper,
} from "@/components/appearance/use-appearance-mutations";
import { ImageIcon, VideoCameraIcon, XIcon } from "@phosphor-icons/react";

import { Spinner } from "@/components/ui/spinner";
import { bannerUrl, wallpaperUrl } from "@/lib/supabase/storage";

type WallpaperUpload = ReturnType<typeof useUploadWallpaper>;
type WallpaperRemove = ReturnType<typeof useRemoveWallpaperMedia>;
type BannerUpload = ReturnType<typeof useUploadBanner>;
type BannerRemove = ReturnType<typeof useRemoveBanner>;

/** The banner media row the "banner" header recipe shows. */
export function BannerMediaRow({
  bannerPath,
  profileId,
  upload,
  remove,
  inputRef,
  onPickFile,
}: {
  bannerPath: string | null;
  profileId: string;
  upload: BannerUpload;
  remove: BannerRemove;
  inputRef: RefObject<HTMLInputElement | null>;
  onPickFile: (event: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <>
      <div className="flex items-center gap-3 rounded-xl border px-3 py-2">
        {bannerPath ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={bannerUrl(bannerPath)}
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
              onClick={() => inputRef.current?.click()}
              className="text-muted-foreground hover:text-foreground text-xs underline"
            >
              Replace
            </button>
            <button
              type="button"
              aria-label="Remove banner image"
              onClick={() =>
                remove.mutate({
                  profileId,
                })
              }
              className="text-muted-foreground hover:text-foreground inline-flex size-8 items-center justify-center rounded-full"
            >
              {remove.isPending ? <Spinner /> : <XIcon className="size-4" />}
            </button>
          </>
        ) : (
          <>
            <span className="bg-muted flex size-12 shrink-0 items-center justify-center rounded-lg">
              {upload.isPending ? (
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
              onClick={() => inputRef.current?.click()}
              className="text-xs font-medium underline"
            >
              Choose file
            </button>
          </>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        className="hidden"
        onChange={onPickFile}
      />
    </>
  );
}

/** The background image or video row, one at a time by wallpaper kind. */
export function WallpaperMediaRow({
  kind,
  path,
  profileId,
  upload,
  remove,
  onPick,
}: {
  kind: "image" | "video";
  path: string | null;
  profileId: string;
  upload: WallpaperUpload;
  remove: WallpaperRemove;
  onPick: () => void;
}) {
  const isVideo = kind === "video";
  const target = isVideo ? "wallpaper-video" : "wallpaper-image";
  const Icon = isVideo ? VideoCameraIcon : ImageIcon;
  const noun = isVideo ? "video" : "image";

  return (
    <div className="flex items-center gap-3 rounded-xl border px-3 py-2">
      {path ? (
        <>
          {isVideo ? (
            <span className="bg-muted flex size-12 shrink-0 items-center justify-center rounded-lg">
              <VideoCameraIcon className="text-muted-foreground size-5" />
            </span>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={wallpaperUrl(path)}
              alt=""
              className="size-12 rounded-lg object-cover"
            />
          )}
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="text-sm font-medium">Background {noun}</span>
            <span className="text-muted-foreground text-xs">
              {isVideo ? "Loops silently behind your page." : "Covers the whole page."}
            </span>
          </div>
          <button
            type="button"
            onClick={onPick}
            className="text-muted-foreground hover:text-foreground text-xs underline"
          >
            Replace
          </button>
          <button
            type="button"
            aria-label={`Remove background ${noun}`}
            onClick={() =>
              remove.mutate({
                profileId,
                target,
              })
            }
            className="text-muted-foreground hover:text-foreground inline-flex size-8 items-center justify-center rounded-full"
          >
            {remove.isPending ? <Spinner /> : <XIcon className="size-4" />}
          </button>
        </>
      ) : (
        <>
          <span className="bg-muted flex size-12 shrink-0 items-center justify-center rounded-lg">
            {upload.isPending && upload.variables?.target === target ? (
              <Spinner />
            ) : (
              <Icon className="text-muted-foreground size-5" />
            )}
          </span>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="text-sm font-medium">Background {noun}</span>
            <span className="text-muted-foreground text-xs">
              No {noun} yet: choose one to upload.
            </span>
          </div>
          <button
            type="button"
            onClick={onPick}
            className="text-xs font-medium underline"
          >
            Choose file
          </button>
        </>
      )}
    </div>
  );
}

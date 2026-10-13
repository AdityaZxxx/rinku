"use client";

import { useEffect, useRef, useState } from "react";
import type { useUploadWallpaper } from "@/components/appearance/use-appearance-mutations";
import { ImageIcon, VideoCameraIcon } from "@phosphor-icons/react";
import { toast } from "sonner";

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
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { imageMaxBytes } from "@/lib/profiles/schema";
import { cn } from "@/lib/utils";

type Upload = ReturnType<typeof useUploadWallpaper>;

/**
 * The wallpaper media picker: drag-and-drop or file browse, a local blob
 * preview of the picked file, then the actual upload. The dialog owns its
 * file intake; the uploaded path reaches the editor draft through `onUploaded`.
 */
export function AppearanceUploadDialog({
  profileId,
  target,
  onClose,
  upload,
  onUploaded,
}: {
  profileId: string;
  /** Which media slot the dialog is picking for, or null when closed. */
  target: "image" | "video" | null;
  onClose: () => void;
  upload: Upload;
  onUploaded: (kind: "image" | "video", path: string) => void;
}) {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
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

  function clearFiles() {
    setImageFile(null);
    setVideoFile(null);
    setDraggingFile(false);
  }

  function acceptSelectedFile(
    accept: "wallpaper-image" | "wallpaper-video",
    file: File | undefined,
  ) {
    if (!file || (accept !== "wallpaper-image" && accept !== "wallpaper-video")) {
      return;
    }
    const isVideo = accept === "wallpaper-video";
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
    const accept = target === "video" ? "wallpaper-video" : "wallpaper-image";
    acceptSelectedFile(accept, event.dataTransfer.files?.[0]);
  }

  function onDragOver(event: React.DragEvent<HTMLElement>) {
    event.preventDefault();
    setDraggingFile(true);
  }

  function onDragLeave() {
    setDraggingFile(false);
  }

  function startUpload(file: File | null) {
    if (!file || target === null) {
      return;
    }
    const kind = target === "video" ? "video" : "image";
    upload.mutate(
      {
        profileId,
        file,
        target: target === "video" ? "wallpaper-video" : "wallpaper-image",
      },
      {
        onSuccess: (result) => {
          onUploaded(kind, result.path);
          onClose();
          clearFiles();
        },
      },
    );
  }

  return (
    <Dialog
      open={target !== null}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
          clearFiles();
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {target === "video"
              ? "Upload a background video"
              : "Upload a background image"}
          </DialogTitle>
          <DialogDescription>
            {target === "video"
              ? "MP4 or WebM up to 25 MB. Loops silently behind your page."
              : "JPEG, PNG, WebP, or AVIF up to 5 MB. Covers the whole page."}
          </DialogDescription>
        </DialogHeader>

        <button
          type="button"
          onClick={() => {
            const input =
              target === "video" ? videoInputRef.current : imageInputRef.current;
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
            {target === "video"
              ? "Drag and drop a video, or choose one"
              : "Drag and drop an image, or choose one"}
          </span>
          <span className="text-muted-foreground text-xs">
            {target === "video"
              ? "MP4 or WebM, max 25 MB"
              : "JPEG, PNG, WebP, or AVIF, max 5 MB"}
          </span>
        </button>

        {(target === "video" && videoFile) ||
        (target === "image" && imageFile) ||
        upload.isPending ? (
          <Attachment
            state={
              upload.isPending
                ? "uploading"
                : (target === "video" && videoFile) || (target === "image" && imageFile)
                  ? "done"
                  : "idle"
            }
            className="w-full max-w-none"
          >
            <AttachmentMedia variant="image" className="size-14 rounded-xl">
              {target === "image" && imageFile ? (
                // eslint-disable-next-line @next/next/no-img-element -- local blob preview of the picked file, rendered once
                <img
                  src={imagePreviewUrl ?? ""}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : target === "video" && videoFile ? (
                <video
                  src={videoPreviewUrl ?? ""}
                  muted
                  className="h-full w-full object-cover"
                />
              ) : target === "video" ? (
                <VideoCameraIcon className="size-5" />
              ) : (
                <ImageIcon className="size-5" />
              )}
            </AttachmentMedia>
            <AttachmentContent>
              <AttachmentTitle>
                {target === "video" ? videoFile?.name : imageFile?.name}
              </AttachmentTitle>
              <AttachmentDescription>
                {target === "video" && videoFile
                  ? `${(videoFile.size / (1024 * 1024)).toFixed(1)} MB`
                  : target === "image" && imageFile
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
              (target === "video" && !videoFile) ||
              (target === "image" && !imageFile) ||
              upload.isPending
            }
            onClick={() => startUpload(target === "video" ? videoFile : imageFile)}
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
  );
}

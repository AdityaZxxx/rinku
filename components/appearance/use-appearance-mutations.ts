"use client";

import type { Profile } from "@/lib/db/schema";
import type { Appearance } from "@/lib/profiles/appearance";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  removeWallpaperMedia,
  updateAppearance,
  uploadWallpaper,
} from "@/app/actions/profiles";

function profileKey(username: string) {
  return ["profile", username] as const;
}

export function useUpdateAppearance(username: string) {
  const queryClient = useQueryClient();
  const key = profileKey(username);

  return useMutation({
    mutationFn: async (input: Appearance) => {
      const result = await updateAppearance({ username, ...input });
      if ("error" in result) {
        throw new Error(result.error);
      }
      return result;
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Profile>(key);
      queryClient.setQueryData<Profile>(key, (old) =>
        old ? { ...old, ...input, updatedAt: new Date() } : old,
      );
      return { previous };
    },
    onError: (error, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(key, context.previous);
      }
      toast.error(
        error instanceof Error ? error.message : "This appearance could not be saved.",
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: key, refetchType: "none" });
    },
  });
}

export function useUploadWallpaper(
  username: string,
  options?: {
    onDone?: (kind: "image" | "video", path: string) => void;
  },
) {
  const queryClient = useQueryClient();
  const key = profileKey(username);

  return useMutation({
    mutationFn: async (input: {
      profileId: string;
      file: File;
      target: "wallpaper-image" | "wallpaper-video";
    }) => {
      const formData = new FormData();
      formData.set("profileId", input.profileId);
      formData.set("file", input.file);
      formData.set("target", input.target);
      const result = await uploadWallpaper(formData);
      if ("error" in result) {
        throw new Error(result.error);
      }
      return result;
    },
    onSuccess: (result) => {
      queryClient.setQueryData<Profile>(key, (old) =>
        old
          ? {
              ...old,
              wallpaperImagePath:
                result.target === "wallpaper-image"
                  ? result.path
                  : old.wallpaperImagePath,
              wallpaperVideoPath:
                result.target === "wallpaper-video"
                  ? result.path
                  : old.wallpaperVideoPath,
              wallpaperKind: result.target === "wallpaper-video" ? "video" : "image",
              themeId: "custom",
              updatedAt: new Date(),
            }
          : old,
      );
      toast(result.target === "wallpaper-video" ? "Video added" : "Image added");
      options?.onDone?.(
        result.target === "wallpaper-video" ? "video" : "image",
        result.path,
      );
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Upload failed. Try again.");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: key });
    },
  });
}

export function useRemoveWallpaperMedia(
  username: string,
  options?: {
    onDone?: (target: "wallpaper-image" | "wallpaper-video") => void;
  },
) {
  const queryClient = useQueryClient();
  const key = profileKey(username);

  return useMutation({
    mutationFn: async (input: {
      profileId: string;
      target: "wallpaper-image" | "wallpaper-video";
    }) => {
      const result = await removeWallpaperMedia(input);
      if ("error" in result) {
        throw new Error(result.error);
      }
      return result;
    },
    onSuccess: (_result, input) => {
      options?.onDone?.(input.target);
      queryClient.setQueryData<Profile>(key, (old) =>
        old
          ? {
              ...old,
              wallpaperImagePath:
                input.target === "wallpaper-image" ? null : old.wallpaperImagePath,
              wallpaperVideoPath:
                input.target === "wallpaper-video" ? null : old.wallpaperVideoPath,
              wallpaperKind: "fill",
              themeId: "custom",
              updatedAt: new Date(),
            }
          : old,
      );
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Removing failed. Try again.");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: key });
    },
  });
}

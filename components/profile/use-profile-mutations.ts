"use client";

import type { Profile } from "@/lib/db/schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { updateProfile, uploadProfileImage } from "@/app/actions/profiles";

function profileKey(username: string) {
  return ["profile", username] as const;
}

export function useUpdateProfile(username: string) {
  const queryClient = useQueryClient();
  const key = profileKey(username);

  return useMutation({
    mutationFn: async (input: { displayName: string; bio: string }) => {
      const result = await updateProfile({ username, ...input });
      if ("error" in result) {
        throw new Error(result.error);
      }
      return result;
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Profile>(key);
      queryClient.setQueryData<Profile>(key, (old) =>
        old
          ? {
              ...old,
              displayName: input.displayName.trim() || null,
              bio: input.bio.trim() || null,
              updatedAt: new Date(),
            }
          : old,
      );
      return { previous };
    },
    onError: (error, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(key, context.previous);
      }
      toast.error(
        error instanceof Error ? error.message : "This profile could not be saved.",
      );
    },
    // Stale without refetching: a refetch here would land between an older
    // save's response and the latest keystrokes and briefly clobber them.
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: key, refetchType: "none" });
    },
  });
}

export function useUploadProfileImage(username: string) {
  const queryClient = useQueryClient();
  const key = profileKey(username);

  return useMutation({
    mutationFn: async (input: {
      profileId: string;
      file: File;
      target: "avatar" | "banner";
    }) => {
      const formData = new FormData();
      formData.set("profileId", input.profileId);
      formData.set("file", input.file);
      formData.set("target", input.target);
      const result = await uploadProfileImage(formData);
      if ("error" in result) {
        throw new Error(result.error);
      }
      return result;
    },
    onSuccess: (result) => {
      queryClient.setQueryData<Profile>(key, (old) =>
        old
          ? result.target === "avatar"
            ? { ...old, avatarPath: result.path, updatedAt: new Date() }
            : { ...old, bannerPath: result.path, updatedAt: new Date() }
          : old,
      );
      toast(result.target === "avatar" ? "Photo updated" : "Banner updated");
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Image upload failed. Try again.",
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: key });
    },
  });
}

"use client";

import { useEffect } from "react";
import type { AppearanceDraftFields, ProfileDraftFields } from "@/lib/editor-draft";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  publishAppearanceSection,
  publishProfileSection,
  saveAppearanceDraft,
  saveProfileDraft,
} from "@/app/actions/profiles";
import { setEditorDirty } from "@/components/profile/unsaved-guard";

function profileKey(username: string) {
  return ["profile", username] as const;
}

export function useSaveProfileDraft(username: string, profileId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ProfileDraftFields) => {
      const result = await saveProfileDraft({ profileId, ...input });
      if ("error" in result) {
        throw new Error(result.error);
      }
      return result;
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Saving this draft failed.");
    },
    onSettled: () => {
      // Stale without refetching: a refetch would clobber the local draft the
      // editor and preview are rendering from.
      queryClient.invalidateQueries({
        queryKey: profileKey(username),
        refetchType: "none",
      });
    },
  });
}

export function usePublishProfileSection(username: string, profileId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const result = await publishProfileSection({ profileId });
      if ("error" in result) {
        throw new Error(result.error);
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: profileKey(username) });
      toast("Profile published");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Publishing failed.");
    },
  });
}

export function useSaveAppearanceDraft(username: string, profileId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: AppearanceDraftFields) => {
      const result = await saveAppearanceDraft({ profileId, ...input });
      if ("error" in result) {
        throw new Error(result.error);
      }
      return result;
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Saving this draft failed.");
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: profileKey(username),
        refetchType: "none",
      });
    },
  });
}

export function usePublishAppearanceSection(username: string, profileId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const result = await publishAppearanceSection({ profileId });
      if ("error" in result) {
        throw new Error(result.error);
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: profileKey(username) });
      toast("Appearance published");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Publishing failed.");
    },
  });
}

/**
 * Marks the tab dirty while a manual draft differs from what the route loaded
 * with, and clears it again once edits are reverted or published.
 */
export function useDraftDirty<T>(draft: T, baseline: T) {
  const dirty = JSON.stringify(draft) !== JSON.stringify(baseline);
  useEffect(() => {
    setEditorDirty(dirty);
    return () => setEditorDirty(false);
  }, [dirty]);
  return dirty;
}

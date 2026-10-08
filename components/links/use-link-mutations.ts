"use client";

import type { Link } from "@/lib/db/schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  archiveLink,
  createLink,
  deleteLink,
  reorderLinks,
  restoreLink,
  updateLink,
} from "@/app/actions/links";
import { parseEmbedUrl } from "@/lib/links/embeds";
import { parseMusicUrl } from "@/lib/links/music";
import { parseVideoUrl } from "@/lib/links/video";

type LinkVariant = Link["variant"];
type PositionUpdate = { id: string; position: number };

function linksKey(profileId: string) {
  return ["links", profileId] as const;
}

function archivedKey(profileId: string) {
  return ["links", profileId, "archive"] as const;
}

/** The order the server hands back, so optimistic writes sort the same way. */
function byPosition(a: Link, b: Link): number {
  return a.position - b.position || a.createdAt.getTime() - b.createdAt.getTime();
}

function rollback(
  queryClient: ReturnType<typeof useQueryClient>,
  key: readonly unknown[],
  previous: Link[] | undefined,
) {
  if (previous) {
    queryClient.setQueryData(key, previous);
  }
}

/**
 * Every link action returns an `{ error }` union, which React Query reads as a
 * success. Each mutationFn narrows and throws, which is what makes onError,
 * and the rollback inside it, fire.
 */
export function useUpdateLink(profileId: string) {
  const queryClient = useQueryClient();
  const key = linksKey(profileId);

  return useMutation({
    mutationFn: async (input: {
      id: string;
      title: string;
      url: string;
      variant: LinkVariant;
      isActive: boolean;
      imageUrl?: string | null;
      metadata?: Link["metadata"];
      visibleFrom?: Date | null;
      visibleUntil?: Date | null;
      minAge?: number | null;
    }) => {
      const result = await updateLink(input);
      if ("error" in result) {
        throw new Error(result.error);
      }
      return result;
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Link[]>(key);
      queryClient.setQueryData<Link[]>(key, (old) =>
        (old ?? []).map((link) =>
          link.id === input.id ? Object.assign({}, link, input) : link,
        ),
      );
      return { previous };
    },
    onError: (error, _input, context) => {
      rollback(queryClient, key, context?.previous);
      toast.error(
        error instanceof Error ? error.message : "This link could not be saved.",
      );
    },
    onSuccess: (result, _input) => {
      // URL edits can reclassify the row (e.g. paste a Spotify URL): merge the
      // server's kind/platform/metadata into the optimistic cache row.
      if ("kind" in result) {
        queryClient.setQueryData<Link[]>(key, (old) =>
          (old ?? []).map((link) =>
            link.id === _input.id
              ? Object.assign({}, link, {
                  kind: result.kind,
                  platform: result.platform,
                  metadata: result.metadata,
                })
              : link,
          ),
        );
      }
    },
    // Stale without refetching: a refetch here would land between an older
    // save's response and the latest keystrokes and briefly clobber them.
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: key, refetchType: "none" });
    },
  });
}

export function useCreateLink(profileId: string) {
  const queryClient = useQueryClient();
  const key = linksKey(profileId);

  return useMutation({
    mutationFn: async (input: {
      title: string;
      url: string;
      variant: LinkVariant;
      imageUrl: string | null;
      platform?: string | null;
    }) => {
      const result = await createLink({ profileId, ...input });
      if ("error" in result) {
        throw new Error(result.error);
      }
      return result;
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Link[]>(key);
      const tempId = crypto.randomUUID();
      const music = input.platform ? null : parseMusicUrl(input.url);
      const video = music || input.platform ? null : parseVideoUrl(input.url);
      const embed = music || video || input.platform ? null : parseEmbedUrl(input.url);
      const optimistic: Link = {
        id: tempId,
        profileId,
        title: "",
        url: "",
        imageUrl: null,
        variant: "classic",
        clickCount: 0,
        isActive: true,
        archivedAt: null,
        kind: input.platform
          ? "social"
          : music
            ? "music"
            : video
              ? "video"
              : embed
                ? "embed"
                : "custom",
        platform: input.platform ?? null,
        metadata: music ?? video ?? embed,
        visibleFrom: null,
        visibleUntil: null,
        minAge: null,
        // Sorts last, so the new row appears at the end of the list until the
        // server hands back the real position.
        position: Number.MAX_SAFE_INTEGER,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      queryClient.setQueryData<Link[]>(key, (old) => [...(old ?? []), optimistic]);
      return { previous, tempId };
    },
    onSuccess: (created, _input, context) => {
      queryClient.setQueryData<Link[]>(key, (old) =>
        (old ?? []).map((link) => (link.id === context?.tempId ? created : link)),
      );
    },
    onError: (_error, _input, context) => {
      rollback(queryClient, key, context?.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: key });
    },
  });
}

export function useArchiveLink(profileId: string) {
  const queryClient = useQueryClient();
  const key = linksKey(profileId);

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await archiveLink({ id });
      if ("error" in result) {
        throw new Error(result.error);
      }
      return result;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Link[]>(key);
      queryClient.setQueryData<Link[]>(key, (old) =>
        (old ?? []).filter((link) => link.id !== id),
      );
      return { previous };
    },
    onError: (_error, _id, context) => {
      rollback(queryClient, key, context?.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: key });
    },
  });
}

export function useRestoreLink(profileId: string) {
  const queryClient = useQueryClient();
  const editorKey = linksKey(profileId);
  const archiveKey = archivedKey(profileId);

  return useMutation({
    mutationFn: async (link: Link) => {
      const result = await restoreLink({ id: link.id });
      if ("error" in result) {
        throw new Error(result.error);
      }
      return result;
    },
    onMutate: async (link) => {
      await queryClient.cancelQueries({ queryKey: ["links", profileId] });
      const previousEditor = queryClient.getQueryData<Link[]>(editorKey);
      const previousArchived = queryClient.getQueryData<Link[]>(archiveKey);
      // Only write a cache that has data: creating an absent one would leave a
      // stale list behind for the other page to flash on mount.
      if (previousArchived) {
        queryClient.setQueryData<Link[]>(
          archiveKey,
          previousArchived.filter((row) => row.id !== link.id),
        );
      }
      if (previousEditor) {
        queryClient.setQueryData<Link[]>(
          editorKey,
          [...previousEditor, link].toSorted(byPosition),
        );
      }
      return { previousEditor, previousArchived };
    },
    onError: (_error, _link, context) => {
      if (context?.previousArchived) {
        queryClient.setQueryData(archiveKey, context.previousArchived);
      }
      if (context?.previousEditor) {
        queryClient.setQueryData(editorKey, context.previousEditor);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["links", profileId] });
    },
  });
}

export function useDeleteLink(profileId: string) {
  const queryClient = useQueryClient();
  const key = archivedKey(profileId);

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await deleteLink({ id });
      if ("error" in result) {
        throw new Error(result.error);
      }
      return result;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["links", profileId] });
      const previous = queryClient.getQueryData<Link[]>(key);
      queryClient.setQueryData<Link[]>(key, (old) =>
        (old ?? []).filter((link) => link.id !== id),
      );
      return { previous };
    },
    onError: (_error, _id, context) => {
      rollback(queryClient, key, context?.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["links", profileId] });
    },
  });
}

export function useReorderLinks(profileId: string) {
  const queryClient = useQueryClient();
  const key = linksKey(profileId);

  return useMutation({
    mutationFn: async (updates: PositionUpdate[]) => {
      const result = await reorderLinks({ profileId, updates });
      if ("error" in result) {
        throw new Error(result.error);
      }
      return result;
    },
    onMutate: async (updates) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Link[]>(key);
      const positions = new Map(updates.map((update) => [update.id, update.position]));
      queryClient.setQueryData<Link[]>(key, (old) =>
        (old ?? [])
          .map((link) => {
            const position = positions.get(link.id);
            return position === undefined ? link : Object.assign({}, link, { position });
          })
          .toSorted(byPosition),
      );
      return { previous };
    },
    onError: (error, _updates, context) => {
      rollback(queryClient, key, context?.previous);
      toast.error(
        error instanceof Error ? error.message : "Reordering failed. Try again.",
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: key });
    },
  });
}

"use client";

import { LinkSimpleIcon } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { useSrcImageFailure } from "@/components/use-image-failure";

export interface LinkMeta {
  title: string;
  imageUrl: string | null;
  url: string;
}

/**
 * The og:image preview card for a pasted URL, plus the inline hints that tell
 * the user how the link will render (music/video/embed) and any submit error.
 */
export function AddLinkUrlPreview({
  meta,
  query,
  validating,
  pending,
  hint,
  error,
  onAdd,
}: {
  meta: LinkMeta | null;
  query: string;
  validating: boolean;
  pending: boolean;
  hint: "music" | "video" | "embed" | null;
  error: string | null;
  onAdd: () => void;
}) {
  // A foreign origin's og:image can 404 at any time, so the preview carries
  // the same failure state as the rows.
  const [imageBroken, onImageFailed, imageRef] = useSrcImageFailure(
    meta?.imageUrl ?? null,
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="border-input bg-card flex items-center gap-3 rounded-xl border p-3">
        {meta?.imageUrl && !imageBroken ? (
          // eslint-disable-next-line @next/next/no-img-element -- cross-host og:image preview: the optimizer cache never earns its keep for one-off hosts
          <img
            ref={imageRef}
            src={meta.imageUrl}
            alt=""
            onError={onImageFailed}
            className="size-10 rounded-full object-cover ring-1 ring-black/10 dark:ring-white/10"
          />
        ) : (
          <LinkSimpleIcon className="text-muted-foreground size-5" />
        )}
        <div className="flex min-w-0 flex-1 flex-col">
          {validating && !meta ? (
            <span className="text-muted-foreground text-sm">Loading preview…</span>
          ) : (
            <span className="truncate text-sm font-medium">{meta?.title ?? query}</span>
          )}
          {meta ? (
            <span className="text-muted-foreground truncate text-xs">{query}</span>
          ) : null}
        </div>
        <Button size="sm" onClick={onAdd} disabled={pending}>
          Add
        </Button>
      </div>
      {hint === "music" ? (
        <p className="text-muted-foreground px-1 text-sm">
          Music link: your profile will play it inline.
        </p>
      ) : hint === "video" ? (
        <p className="text-muted-foreground px-1 text-sm">
          Video link: your profile will play it inline.
        </p>
      ) : hint === "embed" ? (
        <p className="text-muted-foreground px-1 text-sm">
          Web link: your profile will render it inline.
        </p>
      ) : null}
      {error ? <p className="text-destructive px-1 text-sm">{error}</p> : null}
    </div>
  );
}

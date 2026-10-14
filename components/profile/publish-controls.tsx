"use client";

import { ArrowUUpLeftIcon, ArrowUUpRightIcon } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

/**
 * The manual-mode action cluster: undo, redo, Cancel, and Save. Rendered
 * inline in the editor's header row (alongside the title), not a full-width
 * strip that would read as detached chrome.
 *
 * Mounted only while there are unpublished changes, so its presence is itself
 * the signal that a save is pending. Cancel rewinds the editor to the
 * published values at once and deletes the staged draft in the background;
 * Save applies it.
 */
export function PublishControls({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onDiscard,
  onPublish,
  publishDisabled,
  publishing,
}: {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onDiscard: () => void;
  onPublish: () => void;
  publishDisabled: boolean;
  publishing: boolean;
}) {
  return (
    <div className="animate-in fade-in-0 flex items-center gap-1 duration-150 motion-reduce:animate-none">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={onUndo}
        disabled={!canUndo}
        aria-label="Undo"
      >
        <ArrowUUpLeftIcon />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={onRedo}
        disabled={!canRedo}
        aria-label="Redo"
      >
        <ArrowUUpRightIcon />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="text-destructive hover:text-destructive"
        onClick={onDiscard}
        disabled={publishing}
      >
        Cancel
      </Button>
      <Button
        type="button"
        size="sm"
        onClick={onPublish}
        disabled={publishDisabled || publishing}
      >
        {publishing ? <Spinner /> : null}
        Save
      </Button>
    </div>
  );
}

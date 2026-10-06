"use client";

import { ArrowUUpLeftIcon, ArrowUUpRightIcon } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

/**
 * The manual-mode action cluster: undo, redo, and Publish. Rendered inline in
 * the editor's header row (alongside the title), matching how the Links editor
 * places its actions — no full-width strip that would read as detached chrome.
 *
 * Mounted only while there are unpublished changes, so its presence is itself
 * the signal that a publish is pending.
 */
export function PublishControls({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onPublish,
  publishDisabled,
  publishing,
}: {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
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
        size="sm"
        onClick={onPublish}
        disabled={publishDisabled || publishing}
      >
        {publishing ? <Spinner /> : null}
        Publish changes
      </Button>
    </div>
  );
}

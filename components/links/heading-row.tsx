"use client";

import { useEffect, useState } from "react";
import type { Link } from "@/lib/db/schema";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArchiveIcon,
  DotsSixVerticalIcon,
  EyeClosedIcon,
  EyeIcon,
  TextTIcon,
} from "@phosphor-icons/react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Toggle } from "@/components/ui/toggle";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useUpdateLink } from "./use-link-mutations";

/** A section divider row: just a title, no URL, drag-to-reorderable. */
export function HeadingRow({
  link,
  onArchive,
}: {
  link: Link;
  onArchive: (link: Link) => void;
}) {
  const update = useUpdateLink(link.profileId);
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: link.id });
  const [title, setTitle] = useState(link.title);
  const [lastServerTitle, setLastServerTitle] = useState(link.title);
  if (link.title !== lastServerTitle) {
    // A save made it back: adopt the server copy, dropping a stale draft.
    setLastServerTitle(link.title);
    setTitle(link.title);
  }

  useEffect(() => {
    const trimmed = title.trim();
    if (trimmed.length === 0 || trimmed === link.title) {
      return;
    }
    const timer = setTimeout(() => {
      update.mutate({
        id: link.id,
        title: trimmed,
        url: "",
        variant: link.variant,
        isActive: link.isActive,
        imageUrl: link.imageUrl,
      });
    }, 600);
    return () => clearTimeout(timer);
  }, [title, link, update]);

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      // The whole row is the drag surface; the 6px mouse
      // sensor activation distance keeps clicks/text selection in the input
      // working.
      {...listeners}
      onKeyDown={undefined}
      role="presentation"
      className={cn(
        "flex items-center gap-2 rounded-2xl border border-dashed bg-transparent p-3 cursor-grab active:cursor-grabbing",
        isDragging && "relative z-10 shadow-lg",
      )}
    >
      <button
        ref={setActivatorNodeRef}
        type="button"
        {...attributes}
        {...listeners}
        className="text-muted-foreground hover:bg-muted -ml-1 cursor-grab touch-none rounded-lg p-2 active:cursor-grabbing"
        aria-label="Drag to reorder"
      >
        <DotsSixVerticalIcon className="size-4" />
      </button>
      <TextTIcon className="text-muted-foreground size-4 shrink-0" />
      <Input
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        aria-label="Section title"
        placeholder="Section title"
        maxLength={100}
        className="h-8 flex-1 border-0 bg-transparent px-1 text-sm font-semibold shadow-none focus-visible:ring-0"
      />
      <Tooltip>
        <TooltipTrigger
          render={
            <Toggle
              size="sm"
              pressed={link.isActive}
              aria-label={link.isActive ? "Hide heading" : "Show heading"}
              onPressedChange={(pressed) => {
                update.mutate({
                  id: link.id,
                  title: link.title,
                  url: "",
                  variant: link.variant,
                  isActive: pressed,
                  imageUrl: link.imageUrl,
                });
                toast(pressed ? "Heading shown" : "Heading hidden");
              }}
            >
              {link.isActive ? <EyeIcon /> : <EyeClosedIcon />}
            </Toggle>
          }
        />
        <TooltipContent>{link.isActive ? "Hide heading" : "Show heading"}</TooltipContent>
      </Tooltip>
      <Button type="button" variant="ghost" size="sm" onClick={() => onArchive(link)}>
        <ArchiveIcon />
        Archive
      </Button>
    </div>
  );
}

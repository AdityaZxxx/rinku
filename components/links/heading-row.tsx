"use client";

import { useEffect, useState } from "react";
import type { Link } from "@/lib/db/schema";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArchiveIcon,
  DotsSixVerticalIcon,
  DotsThreeVerticalIcon,
  EyeClosedIcon,
  EyeIcon,
  TextTIcon,
} from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { HEADING_TITLE_MAX } from "@/lib/links/model";
import { EASE_OUT } from "@/lib/links/motion";
import { cn } from "@/lib/utils";
import { useHeadingLimitNotice } from "./use-heading-limit-notice";
import { useUpdateLink } from "./use-link-mutations";

/** A section divider row: just a title, no URL, drag-to-reorderable. */
export function HeadingRow({
  link,
  onArchive,
  selecting,
  selected,
  onToggleSelected,
}: {
  link: Link;
  onArchive: (link: Link) => void;
  selecting: boolean;
  selected: boolean;
  onToggleSelected: () => void;
}) {
  const update = useUpdateLink(link.profileId);
  const limit = useHeadingLimitNotice();
  const hidden = !link.isActive;
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: link.id,
    transition: { duration: 200, easing: EASE_OUT },
  });
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
      // working. Selection mode turns the row into a picker instead.
      {...(selecting ? {} : listeners)}
      onKeyDown={undefined}
      role="presentation"
      className={cn(
        "flex items-center gap-2 rounded-2xl border border-dashed bg-transparent p-3",
        selecting ? "cursor-default" : "cursor-grab active:cursor-grabbing",
        isDragging && "opacity-40",
      )}
    >
      {selecting ? (
        // The grip's exact box, so the icon and title keep their positions.
        <span className="-ml-1 flex size-8 shrink-0 items-center justify-center">
          <Checkbox
            checked={selected}
            onCheckedChange={() => onToggleSelected()}
            aria-label={`Select ${link.title}`}
            className="size-5"
          />
        </span>
      ) : (
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
      )}
      <TextTIcon
        className={cn("text-muted-foreground size-4 shrink-0", hidden && "opacity-60")}
      />
      {selecting ? (
        // The input's exact box as one big toggle target, matching how a
        // regular link row's title area selects.
        <button
          type="button"
          onClick={onToggleSelected}
          aria-pressed={selected}
          className={cn(
            "h-8 min-w-0 flex-1 truncate px-1 text-left text-sm",
            hidden ? "text-muted-foreground" : "font-semibold",
          )}
        >
          {link.title}
        </button>
      ) : (
        <>
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            onKeyDown={limit.onKeyDown}
            onPaste={limit.onPaste}
            onBlur={limit.dismiss}
            aria-label="Section title"
            placeholder="Section title"
            maxLength={HEADING_TITLE_MAX}
            className={cn(
              "h-8 min-w-0 flex-1 border-0 bg-transparent px-1 text-sm shadow-none focus-visible:ring-0",
              hidden ? "text-muted-foreground" : "font-semibold",
            )}
          />
          {limit.atLimit ? (
            <span
              aria-live="polite"
              className="text-foreground shrink-0 text-xs font-medium"
            >
              Max {HEADING_TITLE_MAX}
            </span>
          ) : null}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" size="icon-sm" aria-label="Heading actions" />
              }
            >
              <DotsThreeVerticalIcon />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-fit">
              <DropdownMenuItem
                onClick={() =>
                  update.mutate({
                    id: link.id,
                    title: link.title,
                    url: "",
                    variant: link.variant,
                    isActive: !link.isActive,
                    imageUrl: link.imageUrl,
                  })
                }
              >
                {link.isActive ? <EyeClosedIcon /> : <EyeIcon />}
                {link.isActive ? "Hide heading" : "Show heading"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onArchive(link)}>
                <ArchiveIcon />
                Archive
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      )}
    </div>
  );
}

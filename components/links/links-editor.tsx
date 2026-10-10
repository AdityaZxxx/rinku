"use client";

import { useEffect, useRef, useState } from "react";
import type { Route } from "next";
import Link from "next/link";
import type { Link as LinkData } from "@/lib/db/schema";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  defaultDropAnimationSideEffects,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { ArchiveIcon, DotsSixVerticalIcon, TextTIcon } from "@phosphor-icons/react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { EditSocialDialog } from "@/components/links/edit-social-dialog";
import { LinkRowShell } from "@/components/links/link-row-shell";
import { SocialIcon } from "@/components/social-icon";
import { Button } from "@/components/ui/button";
import { changedPositions } from "@/lib/links/model";
import { EASE_OUT } from "@/lib/links/motion";
import { platformById } from "@/lib/links/platforms";
import { cn } from "@/lib/utils";
import { AddLinkDialog } from "./add-link-dialog";
import { HeadingRow } from "./heading-row";
import { LinkRow } from "./link-row";
import {
  applyReorderToCache,
  useArchiveLink,
  useReorderLinks,
  useRestoreLink,
} from "./use-link-mutations";
import { useLinksQuery } from "./use-links-query";

const VERTICAL_AXIS = [restrictToVerticalAxis];

const DROP_ANIMATION = {
  duration: 250,
  easing: EASE_OUT,
  sideEffects: defaultDropAnimationSideEffects({
    styles: { active: { opacity: "0.5" } },
  }),
};

const OVERLAY_TRANSITION = `transform 250ms ${EASE_OUT}`;

export function LinksEditor({
  profileId,
  username,
  initialLinks,
}: {
  profileId: string;
  username: string;
  initialLinks: LinkData[];
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const archive = useArchiveLink(profileId);
  const restore = useRestoreLink(profileId);
  const reorder = useReorderLinks(profileId);
  const queryClient = useQueryClient();
  const reducedMotion = usePrefersReducedMotion();
  const dropAnimation = reducedMotion ? null : DROP_ANIMATION;

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const { query, links } = useLinksQuery(profileId, initialLinks);
  const socialLinks = links.filter((link) => link.kind === "social");
  const customLinks = links.filter((link) => link.kind !== "social");
  const itemIds = customLinks.map((link) => link.id);
  const socialIds = socialLinks.map((link) => link.id);
  const socialDraggingRef = useRef(false);
  const activeLink = activeId ? links.find((link) => link.id === activeId) : undefined;

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }
    const order = customLinks.map((link) => link.id);
    const from = order.indexOf(String(active.id));
    const to = order.indexOf(String(over.id));
    if (from === -1 || to === -1) {
      return;
    }
    const updates = changedPositions(
      customLinks,
      arrayMove(order, from, to),
      String(active.id),
    );
    if (updates.length > 0) {
      const previous = applyReorderToCache(queryClient, profileId, updates);
      reorder.mutate({ updates, previous });
    }
  }

  function onDragEndSocial(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }
    const order = socialLinks.map((link) => link.id);
    const from = order.indexOf(String(active.id));
    const to = order.indexOf(String(over.id));
    if (from === -1 || to === -1) {
      return;
    }
    const updates = changedPositions(
      socialLinks,
      arrayMove(order, from, to),
      String(active.id),
    );
    if (updates.length > 0) {
      const previous = applyReorderToCache(queryClient, profileId, updates);
      reorder.mutate({ updates, previous });
    }
  }

  async function onArchive(link: LinkData) {
    setExpandedId(null);
    try {
      await archive.mutateAsync(link.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Archiving this link failed.");
      return;
    }
    toast("Link archived", {
      action: { label: "Undo", onClick: () => restore.mutate(link) },
      duration: 6000,
    });
  }

  function onCreated(linkId: string) {
    setExpandedId(linkId);
    requestAnimationFrame(() => {
      document
        .getElementById(`link-${linkId}`)
        ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-lg font-medium">Links</h1>
          <p className="text-muted-foreground text-sm">
            Drag to reorder. Changes save as you make them.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            // SAFETY: /:username/links/archive for the current profile; the
            // typed route union is only knowable for literals.
            render={<Link href={`/${username}/links/archive` as Route} />}
          >
            <ArchiveIcon />
            Archive
          </Button>
          <AddLinkDialog profileId={profileId} onCreated={onCreated} />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <DndContext
          id="socials-dnd"
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={({ active }) => {
            socialDraggingRef.current = true;
            setActiveId(String(active.id));
          }}
          onDragEnd={(event) => {
            onDragEndSocial(event);
            setActiveId(null);
            setTimeout(() => {
              socialDraggingRef.current = false;
            }, 150);
          }}
          onDragCancel={() => {
            setActiveId(null);
          }}
        >
          <SortableContext items={socialIds} strategy={rectSortingStrategy}>
            <div className="flex flex-wrap items-center gap-2">
              {socialLinks.map((link) => (
                <SocialChip key={link.id} link={link} draggingRef={socialDraggingRef} />
              ))}
            </div>
          </SortableContext>
          <DragOverlay dropAnimation={dropAnimation} transition={OVERLAY_TRANSITION}>
            {activeLink?.kind === "social" ? (
              <SocialChipPreview link={activeLink} />
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      {query.isError && (
        <output className="text-destructive text-sm">{query.error.message}</output>
      )}

      {customLinks.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed p-6 sm:p-10">
          <p className="text-sm font-medium">No links yet</p>
          <p className="text-muted-foreground text-sm">
            Links show up on your page in the order you set here.
          </p>
          <AddLinkDialog profileId={profileId} onCreated={onCreated} />
        </div>
      ) : (
        <DndContext
          id="links-dnd"
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={VERTICAL_AXIS}
          onDragStart={({ active }) => {
            setActiveId(String(active.id));
          }}
          onDragEnd={(event) => {
            onDragEnd(event);
            setActiveId(null);
          }}
          onDragCancel={() => {
            setActiveId(null);
          }}
        >
          <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-3">
              {customLinks.map((link) => (
                <div key={link.id} id={`link-${link.id}`}>
                  {link.kind === "heading" ? (
                    <HeadingRow link={link} onArchive={onArchive} />
                  ) : (
                    <LinkRow
                      link={link}
                      expanded={expandedId === link.id}
                      onToggleExpand={() =>
                        setExpandedId((current) => (current === link.id ? null : link.id))
                      }
                      onArchive={onArchive}
                    />
                  )}
                </div>
              ))}
            </div>
          </SortableContext>
          <DragOverlay dropAnimation={dropAnimation} transition={OVERLAY_TRANSITION}>
            {activeLink && activeLink.kind !== "social" ? (
              activeLink.kind === "heading" ? (
                <HeadingPreview link={activeLink} />
              ) : (
                <LinkRowShell link={activeLink} className="scale-[1.02] shadow-lg" />
              )
            ) : null}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
}

function SocialChip({
  link,
  draggingRef,
}: {
  link: LinkData;
  draggingRef: React.RefObject<boolean>;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({
      id: link.id,
      transition: { duration: 200, easing: EASE_OUT },
    });
  const [editing, setEditing] = useState(false);
  const Platform = platformById(link.platform);
  if (!Platform) return null;
  return (
    <>
      <span
        ref={setNodeRef}
        style={{
          transform: transform
            ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
            : undefined,
          transition,
        }}
        className={cn(
          "border-input bg-card relative inline-flex size-9 items-center justify-center rounded-full border",
          isDragging && "opacity-40",
        )}
      >
        <button
          type="button"
          {...attributes}
          {...listeners}
          onClick={() => {
            if (draggingRef.current) return;
            setEditing(true);
          }}
          aria-label={`Edit ${Platform.label}`}
          className="inline-flex size-9 cursor-grab touch-none items-center justify-center rounded-full active:cursor-grabbing"
        >
          <SocialIcon id={Platform.id} className="size-4" />
        </button>
      </span>
      <EditSocialDialog link={link} open={editing} onOpenChange={setEditing} />
    </>
  );
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return reduced;
}

function HeadingPreview({ link }: { link: LinkData }) {
  return (
    <div className="flex scale-[1.02] items-center gap-2 rounded-2xl border border-dashed bg-transparent p-3 shadow-lg">
      <DotsSixVerticalIcon className="text-muted-foreground size-4 shrink-0" />
      <TextTIcon className="text-muted-foreground size-4 shrink-0" />
      <span className="flex-1 truncate text-sm font-semibold">{link.title}</span>
    </div>
  );
}

function SocialChipPreview({ link }: { link: LinkData }) {
  const Platform = platformById(link.platform);
  if (!Platform) return null;
  return (
    <span className="border-input bg-card inline-flex size-9 items-center justify-center rounded-full border shadow-lg">
      <SocialIcon id={Platform.id} className="size-4" />
    </span>
  );
}

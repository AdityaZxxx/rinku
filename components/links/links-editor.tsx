"use client";

import { useMemo, useState } from "react";
import type { Link } from "@/lib/db/schema";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { getLinks } from "@/app/actions/links";
import { changedPositions } from "@/lib/links";
import { AddLinkDialog } from "./add-link-dialog";
import { LinkRow } from "./link-row";
import { useDeleteLink, useReorderLinks, useRestoreLink } from "./use-link-mutations";

const VERTICAL_AXIS = [restrictToVerticalAxis];

export function LinksEditor({
  profileId,
  initialLinks,
}: {
  profileId: string;
  initialLinks: Link[];
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const remove = useDeleteLink(profileId);
  const restore = useRestoreLink(profileId);
  const reorder = useReorderLinks(profileId);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const query = useQuery({
    queryKey: ["links", profileId],
    queryFn: async () => {
      const result = await getLinks(profileId);
      if ("error" in result) {
        throw new Error(result.error);
      }
      return result;
    },
    initialData: initialLinks,
  });
  const links = useMemo(
    () => (Array.isArray(query.data) ? query.data : []),
    [query.data],
  );
  const itemIds = useMemo(() => links.map((link) => link.id), [links]);

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }
    const order = links.map((link) => link.id);
    const from = order.indexOf(String(active.id));
    const to = order.indexOf(String(over.id));
    if (from === -1 || to === -1) {
      return;
    }
    const updates = changedPositions(links, arrayMove(order, from, to));
    if (updates.length > 0) {
      reorder.mutate(updates);
    }
  }

  async function onDelete(link: Link) {
    setExpandedId(null);
    try {
      await remove.mutateAsync(link.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Deleting this link failed.");
      return;
    }
    toast("Link deleted", {
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
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-lg font-medium">Links</h1>
          <p className="text-muted-foreground text-sm">
            Drag to reorder. Changes save as you make them.
          </p>
        </div>
        <AddLinkDialog profileId={profileId} onCreated={onCreated} />
      </div>

      {query.isError && <p className="text-destructive text-sm">{query.error.message}</p>}

      {links.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed p-10">
          <p className="text-muted-foreground text-sm">No links yet.</p>
          <AddLinkDialog profileId={profileId} onCreated={onCreated} />
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={VERTICAL_AXIS}
          onDragEnd={onDragEnd}
        >
          <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-2">
              {links.map((link) => (
                <div key={link.id} id={`link-${link.id}`}>
                  <LinkRow
                    link={link}
                    expanded={expandedId === link.id}
                    onToggleExpand={() =>
                      setExpandedId((current) => (current === link.id ? null : link.id))
                    }
                    onDelete={onDelete}
                  />
                </div>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

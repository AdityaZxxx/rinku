"use client";

import Image from "next/image";
import type { Link } from "@/lib/db/schema";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArchiveIcon,
  CalendarBlankIcon,
  CaretDownIcon,
  LockSimpleIcon,
  DotsSixVerticalIcon,
  EyeClosedIcon,
  EyeIcon,
  GlobeSimpleIcon,
  LinkSimpleIcon,
} from "@phosphor-icons/react";
import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";
import * as z from "zod";

import { ThumbnailSection } from "@/components/links/thumbnail-section";
import { MediaIcon } from "@/components/media-icon";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Toggle } from "@/components/ui/toggle";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { isIconMedia } from "@/lib/links/media";
import {
  displayUrl,
  faviconUrl,
  linkInputSchema,
  scheduleStatus,
} from "@/lib/links/model";
import { cn } from "@/lib/utils";
import { AgeGateSection } from "./age-gate-section";
import { SchedulePicker, scheduleSummary } from "./schedule-picker";
import { useUpdateLink } from "./use-link-mutations";

type LinkRowProps = {
  link: Link;
  expanded: boolean;
  onToggleExpand: () => void;
  onArchive: (link: Link) => void;
};

export function LinkRow({ link, expanded, onToggleExpand, onArchive }: LinkRowProps) {
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

  // One autosave per row: any field change coalesces into a single commit
  // 800ms after the last keystroke. A half-typed URL is invalid, so the
  // listener skips it instead of saving it.
  const form = useForm({
    defaultValues: {
      title: link.title,
      url: link.url,
      variant: link.variant,
      isActive: link.isActive,
      imageUrl: link.imageUrl,
      style: link.metadata?.style ?? "embed",
    },
    validators: {
      onChange: linkInputSchema.extend({
        style: z.enum(["embed", "classic", "featured"]),
      }),
    },
    listeners: {
      onChange: ({ formApi }) => {
        if (!formApi.state.isValid) {
          return;
        }
        const { style, ...fields } = formApi.state.values;
        update.mutate({
          id: link.id,
          ...fields,
          // Only player/embed blocks carry a style; stripping it elsewhere
          // keeps plain rows out of music/video/embed edits. The schedule
          // (visibleFrom/visibleUntil) lives in the dialog instead, which
          // sends those fields explicitly.
          metadata:
            (link.kind === "music" || link.kind === "video" || link.kind === "embed") &&
            link.metadata
              ? { ...link.metadata, style }
              : undefined,
        });
      },
      onChangeDebounceMs: 800,
    },
  });

  const icon = faviconUrl(link.url);
  const hidden = !link.isActive;
  const status = scheduleStatus(link);
  const summary = scheduleSummary(link.visibleFrom, link.visibleUntil);
  // Scheduling is derived, not a separate flag: a schedule exists iff a bound
  // is set, so toggling on opens the picker and removing the range turns it off.
  const scheduled = link.visibleFrom !== null || link.visibleUntil !== null;

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      // The whole row is the drag surface; the keyboard listener is dropped
      // here so Space/Enter inside the expand button can't start a drag: the
      // keyboard path stays on the grip button. The pointer gesture carries no
      // control semantics, so the surface stays out of the a11y tree.
      {...listeners}
      onKeyDown={undefined}
      role="presentation"
      className={cn(
        "bg-card cursor-grab rounded-2xl border motion-reduce:transition-none! active:cursor-grabbing",
        isDragging && "relative z-10 shadow-lg",
      )}
    >
      <div className="flex items-center gap-2 p-3">
        <button
          ref={setActivatorNodeRef}
          type="button"
          {...attributes}
          {...listeners}
          className="text-muted-foreground hover:bg-muted focus:bg-muted sr-only -ml-1 touch-none rounded-lg p-2 focus:not-sr-only"
          aria-label="Drag to reorder"
        >
          <DotsSixVerticalIcon className="size-4" />
        </button>

        {link.imageUrl && isIconMedia(link.imageUrl) ? (
          <span className="bg-muted flex size-10 shrink-0 items-center justify-center rounded-full">
            <MediaIcon imageUrl={link.imageUrl} className="size-5" />
          </span>
        ) : link.imageUrl && link.imageUrl !== "" ? (
          <Image
            unoptimized
            src={link.imageUrl}
            alt=""
            width={40}
            height={40}
            className={cn(
              "size-10 shrink-0 rounded-full object-cover",
              hidden && "opacity-60 grayscale",
            )}
          />
        ) : link.imageUrl === null && icon ? (
          <Image
            unoptimized
            src={icon}
            alt=""
            width={40}
            height={40}
            className={cn(
              "bg-muted size-10 shrink-0 rounded-full object-contain p-1.5",
              hidden && "opacity-60 grayscale",
            )}
          />
        ) : (
          <span
            className={cn(
              "bg-muted flex size-10 shrink-0 items-center justify-center rounded-full",
              hidden && "opacity-60",
            )}
          >
            <GlobeSimpleIcon className="text-muted-foreground size-5" />
          </span>
        )}

        <button
          type="button"
          onClick={onToggleExpand}
          className="flex min-w-0 flex-1 flex-col items-start gap-0.5 text-left"
          aria-expanded={expanded}
        >
          <span
            className={cn(
              "max-w-full truncate text-sm",
              hidden ? "text-muted-foreground" : "font-medium",
            )}
          >
            {link.title}
          </span>
          <span className="text-muted-foreground flex max-w-full items-center gap-1.5 truncate text-xs">
            {summary ? (
              <span className="bg-muted text-muted-foreground inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] leading-none font-medium">
                <CalendarBlankIcon className="size-2.5" />
                {status === "scheduled"
                  ? "Scheduled "
                  : status === "expired"
                    ? "Expired "
                    : null}
                {summary}
              </span>
            ) : null}
            <span className="truncate">{displayUrl(link.url)}</span>
            {link.minAge ? (
              <span className="bg-muted text-muted-foreground inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] leading-none font-medium">
                <LockSimpleIcon className="size-2.5" />
                {link.minAge}+
              </span>
            ) : null}
          </span>
        </button>

        <Tooltip>
          <TooltipTrigger
            render={
              <button
                type="button"
                onClick={onToggleExpand}
                className="text-muted-foreground hover:bg-muted rounded-lg p-2"
                aria-expanded={expanded}
                aria-label={expanded ? "Collapse link" : "Expand link"}
              >
                <CaretDownIcon
                  className={cn(
                    "size-4 transition-transform duration-200 motion-reduce:transition-none",
                    expanded && "rotate-180",
                  )}
                />
              </button>
            }
          />
          <TooltipContent>{expanded ? "Collapse" : "Expand"}</TooltipContent>
        </Tooltip>
      </div>

      {expanded && (
        <div className="flex flex-col gap-4 border-t p-3">
          <form.Field name="title">
            {(field) => {
              const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>Title</FieldLabel>
                  <Input
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                    aria-invalid={isInvalid}
                    autoComplete="off"
                    placeholder="My website"
                  />
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              );
            }}
          </form.Field>

          <form.Field name="url">
            {(field) => {
              const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>URL</FieldLabel>
                  <InputGroup>
                    <InputGroupAddon align="inline-start">
                      <LinkSimpleIcon />
                    </InputGroupAddon>
                    <InputGroupInput
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(event) => field.handleChange(event.target.value)}
                      aria-invalid={isInvalid}
                      autoComplete="off"
                      spellCheck={false}
                      placeholder="example.com"
                    />
                  </InputGroup>
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              );
            }}
          </form.Field>

          {link.kind === "music" || link.kind === "video" || link.kind === "embed" ? (
            <form.Field name="style">
              {(field) => (
                <Field>
                  <FieldLabel id="music-style-label">Style</FieldLabel>
                  <div className="grid grid-cols-3 gap-2 sm:max-w-sm">
                    {(["embed", "classic", "featured"] as const).map((value) => (
                      <label
                        key={value}
                        className={cn(
                          "relative flex flex-col gap-2 rounded-xl border p-2.5 pb-6 text-left text-sm has-focus-visible:ring-3 has-focus-visible:ring-ring/30",
                          field.state.value === value
                            ? "border-ring ring-ring/30 ring-3"
                            : "border-input",
                        )}
                      >
                        <input
                          type="radio"
                          name="music-style"
                          value={value}
                          checked={field.state.value === value}
                          onChange={() => field.handleChange(value)}
                          className="sr-only"
                        />
                        {value === "embed" ? (
                          <span className="flex h-8 items-center justify-center rounded-md border">
                            <span className="bg-muted-foreground/30 size-2.5 rounded-full" />
                          </span>
                        ) : value === "classic" ? (
                          <span className="flex items-center gap-1.5 rounded-full border px-2 py-1">
                            <span className="bg-muted-foreground/30 size-3 rounded-full" />
                            <span className="bg-muted-foreground/20 h-1.5 flex-1 rounded-full" />
                          </span>
                        ) : (
                          <span className="flex flex-col overflow-hidden rounded-md border">
                            <span className="bg-muted-foreground/20 h-8 w-full" />
                            <span className="px-1.5 py-1">
                              <span className="bg-muted-foreground/20 block h-1.5 w-2/3 rounded-full" />
                            </span>
                          </span>
                        )}
                        <span className="text-muted-foreground absolute inset-x-0 bottom-0.5 text-center text-xs capitalize">
                          {value}
                        </span>
                      </label>
                    ))}
                  </div>
                </Field>
              )}
            </form.Field>
          ) : (
            <form.Field name="variant">
              {(field) => {
                return (
                  <Field>
                    <FieldLabel id="link-style-label">Style</FieldLabel>
                    <div className="grid grid-cols-2 gap-2 sm:max-w-xs">
                      {(["classic", "featured"] as const).map((value) => (
                        <label
                          key={value}
                          className={cn(
                            "relative flex flex-col gap-2 rounded-xl border p-2.5 pb-6 text-left text-sm has-focus-visible:ring-3 has-focus-visible:ring-ring/30",
                            field.state.value === value
                              ? "border-ring ring-ring/30 ring-3"
                              : "border-input",
                          )}
                        >
                          <input
                            type="radio"
                            name="link-style"
                            value={value}
                            checked={field.state.value === value}
                            onChange={() => field.handleChange(value)}
                            className="sr-only"
                          />
                          {value === "classic" ? (
                            <span className="flex items-center gap-1.5 rounded-full border px-2 py-1">
                              <span className="bg-muted-foreground/30 size-3 rounded-full" />
                              <span className="bg-muted-foreground/20 h-1.5 flex-1 rounded-full" />
                            </span>
                          ) : (
                            <span className="flex flex-col overflow-hidden rounded-md border">
                              <span className="bg-muted-foreground/20 h-8 w-full" />
                              <span className="px-1.5 py-1">
                                <span className="bg-muted-foreground/20 block h-1.5 w-2/3 rounded-full" />
                              </span>
                            </span>
                          )}
                          <span className="text-muted-foreground absolute inset-x-0 bottom-0.5 text-center text-xs">
                            {value === "classic" ? "Classic" : "Featured"}
                          </span>
                        </label>
                      ))}
                    </div>
                  </Field>
                );
              }}
            </form.Field>
          )}

          <ThumbnailSection link={link} />

          <SchedulePicker
            from={link.visibleFrom}
            until={link.visibleUntil}
            onSave={(from, until) => {
              update.mutate({
                id: link.id,
                title: link.title,
                url: link.url,
                variant: link.variant,
                isActive: link.isActive,
                imageUrl: link.imageUrl,
                visibleFrom: from,
                visibleUntil: until,
              });
              if (!from && !until) {
                toast("Schedule removed");
              } else {
                toast("Schedule saved");
              }
            }}
            trigger={
              <button
                type="button"
                className="group/schedule flex w-full items-center gap-3 text-left"
              >
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-sm leading-none font-medium">
                    Schedule visibility
                  </span>
                  <span className="text-muted-foreground group-hover/schedule:text-foreground flex items-center gap-1.5 truncate text-xs transition-colors">
                    {scheduled ? (
                      <span className="truncate">
                        {status === "scheduled"
                          ? `Goes live ${summary}`
                          : status === "expired"
                            ? `Was live ${summary}`
                            : `Live ${summary}`}
                      </span>
                    ) : (
                      <span className="truncate">Show this link only on chosen days</span>
                    )}
                  </span>
                </div>
                <CalendarBlankIcon
                  className={cn(
                    "size-4.5 shrink-0 transition-colors",
                    scheduled
                      ? "text-foreground"
                      : "text-muted-foreground group-hover/schedule:text-foreground",
                  )}
                  weight={scheduled ? "fill" : "regular"}
                  aria-hidden
                />
              </button>
            }
          />

          <AgeGateSection
            minAge={link.minAge}
            onSave={(minAge) => {
              update.mutate({
                id: link.id,
                title: link.title,
                url: link.url,
                variant: link.variant,
                isActive: link.isActive,
                imageUrl: link.imageUrl,
                minAge,
              });
              toast(
                minAge === null
                  ? "Age restriction removed"
                  : `Visitors will confirm they are ${minAge}+`,
              );
            }}
          />

          <div className="flex items-center justify-between">
            <form.Field name="isActive">
              {(field) => (
                <Toggle
                  size="sm"
                  pressed={field.state.value}
                  onPressedChange={(pressed) => {
                    field.handleChange(pressed);
                    toast(pressed ? "Link shown" : "Link hidden");
                  }}
                >
                  {field.state.value ? <EyeIcon /> : <EyeClosedIcon />}
                  {field.state.value ? "Hide" : "Show"}
                </Toggle>
              )}
            </form.Field>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onArchive(link)}
            >
              <ArchiveIcon />
              Archive
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

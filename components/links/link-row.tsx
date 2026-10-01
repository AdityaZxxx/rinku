"use client";

import { useMemo } from "react";
import Image from "next/image";
import type { Link } from "@/lib/db/schema";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  CaretDownIcon,
  DotsSixVerticalIcon,
  GlobeSimpleIcon,
  LinkSimpleIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { useForm } from "@tanstack/react-form";
import { useSelector } from "@tanstack/react-store";

import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { displayUrl, faviconUrl, linkInputSchema } from "@/lib/links";
import { cn } from "@/lib/utils";
import { useUpdateLink } from "./use-link-mutations";

type LinkRowProps = {
  link: Link;
  expanded: boolean;
  onToggleExpand: () => void;
  onDelete: (link: Link) => void;
};

export function LinkRow({ link, expanded, onToggleExpand, onDelete }: LinkRowProps) {
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
    },
    validators: { onChange: linkInputSchema },
    listeners: {
      onChange: ({ formApi }) => {
        if (!formApi.state.isValid) {
          return;
        }
        update.mutate({ id: link.id, ...formApi.state.values });
      },
      onChangeDebounceMs: 800,
    },
  });

  const icon = faviconUrl(link.url);
  const thumbnail = link.variant === "featured" && link.imageUrl ? link.imageUrl : null;
  const dragStyle = useMemo(
    () => ({ transform: CSS.Transform.toString(transform), transition }),
    [transform, transition],
  );
  const variant = useSelector(form.store, (state) => state.values.variant);
  const variantValue = useMemo(() => [variant], [variant]);

  return (
    <div
      ref={setNodeRef}
      style={dragStyle}
      className={cn(
        "bg-card rounded-2xl border",
        isDragging && "relative z-10 shadow-lg",
        !link.isActive && "opacity-60",
      )}
    >
      <div className="flex items-center gap-2 p-3">
        <button
          ref={setActivatorNodeRef}
          type="button"
          {...attributes}
          {...listeners}
          className="text-muted-foreground hover:bg-muted -ml-1 touch-none rounded-lg p-1"
          aria-label="Drag to reorder"
        >
          <DotsSixVerticalIcon className="size-4" />
        </button>

        {thumbnail ? (
          <Image
            unoptimized
            src={thumbnail}
            alt=""
            width={40}
            height={40}
            className="outline-foreground/10 size-10 shrink-0 rounded-xl object-cover outline-1"
          />
        ) : icon ? (
          <Image
            unoptimized
            src={icon}
            alt=""
            width={40}
            height={40}
            className="bg-muted size-10 shrink-0 rounded-xl object-contain p-1.5"
          />
        ) : (
          <span className="bg-muted flex size-10 shrink-0 items-center justify-center rounded-xl">
            <GlobeSimpleIcon className="text-muted-foreground size-5" />
          </span>
        )}

        <button
          type="button"
          onClick={onToggleExpand}
          className="flex min-w-0 flex-1 flex-col items-start gap-0.5 text-left"
          aria-expanded={expanded}
        >
          <span className="truncate text-sm font-medium">{link.title}</span>
          <span className="text-muted-foreground truncate text-xs">
            {displayUrl(link.url)}
          </span>
        </button>

        <form.Field name="isActive">
          {(field) => (
            <Switch
              checked={field.state.value}
              onCheckedChange={(checked) => field.handleChange(checked)}
              aria-label={field.state.value ? "Hide link" : "Show link"}
            />
          )}
        </form.Field>

        <button
          type="button"
          onClick={onToggleExpand}
          className="text-muted-foreground hover:bg-muted rounded-lg p-1"
          aria-expanded={expanded}
          aria-label={expanded ? "Collapse link" : "Expand link"}
        >
          <CaretDownIcon
            className={cn(
              "size-4 transition-transform duration-200",
              expanded && "rotate-180",
            )}
          />
        </button>
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

          <form.Field name="variant">
            {(field) => {
              return (
                <Field>
                  <FieldLabel>Style</FieldLabel>
                  <ToggleGroup
                    value={variantValue}
                    onValueChange={(groupValue) => {
                      const next = groupValue[0];
                      if (next === "classic" || next === "featured") {
                        field.handleChange(next);
                      }
                    }}
                  >
                    <ToggleGroupItem value="classic">Classic</ToggleGroupItem>
                    <ToggleGroupItem value="featured">Featured</ToggleGroupItem>
                  </ToggleGroup>
                </Field>
              );
            }}
          </form.Field>

          <div className="flex items-center justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => onDelete(link)}
            >
              <TrashIcon />
              Delete
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { AppleMusicResult } from "@/lib/links/apple-music";
import { MagnifyingGlassIcon, PlusIcon } from "@phosphor-icons/react";
import { useForm } from "@tanstack/react-form";

import { fetchUrlMetadata } from "@/app/actions/links/link";
import { AddLinkItemForm, CategoryIcon } from "@/components/links/add-link-item-form";
import {
  AddLinkUrlPreview,
  type LinkMeta,
} from "@/components/links/add-link-url-preview";
import { SocialIcon } from "@/components/social-icon";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";
import { CATALOG, CATEGORIES, type CatalogItem } from "@/lib/links/catalog";
import { parseEmbedUrl } from "@/lib/links/embeds";
import { hostnameOf, isLinkLike, linkUrlSchema, normalizeUrl } from "@/lib/links/model";
import { parseMusicUrl } from "@/lib/links/music";
import { parseVideoUrl } from "@/lib/links/video";
import { useCreateLink, useCreateSectionHeading } from "./use-link-mutations";

type Category = (typeof CATEGORIES)[number]["id"];

export function AddLinkDialog({
  profileId,
  onCreated,
}: {
  profileId: string;
  onCreated: (linkId: string) => void;
}) {
  const create = useCreateLink(profileId);
  const createHeading = useCreateSectionHeading(profileId);
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<Category>("socials");
  const [selected, setSelected] = useState<CatalogItem | null>(null);
  const [meta, setMeta] = useState<LinkMeta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open || selected) return;
    searchRef.current?.focus();
  }, [open, selected]);

  function reset() {
    setCategory("socials");
    setSelected(null);
    setMeta(null);
    setError(null);
    form.reset();
  }

  function addMusicResult(result: AppleMusicResult) {
    setError(null);
    startTransition(async () => {
      try {
        const created = await create.mutateAsync({
          title: result.title,
          url: result.url,
          variant: "classic",
          imageUrl: result.imageUrl,
        });
        setOpen(false);
        reset();
        onCreated(created.id);
      } catch (mutationError) {
        setError(
          mutationError instanceof Error
            ? mutationError.message
            : "Adding this link failed. Try again.",
        );
      }
    });
  }

  function addHeading(title: string) {
    if (!title) {
      setError("Give the heading some text.");
      return;
    }
    startTransition(async () => {
      try {
        const created = await createHeading.mutateAsync({ title });
        setOpen(false);
        reset();
        onCreated(created.id);
      } catch (mutationError) {
        setError(
          mutationError instanceof Error
            ? mutationError.message
            : "Adding this heading failed. Try again.",
        );
      }
    });
  }

  const form = useForm({
    defaultValues: { query: "" },
    onSubmit: async ({ value }) => {
      if (!isLinkLike(value.query)) return;
      const normalized = normalizeUrl(value.query);
      startTransition(async () => {
        try {
          const created = await create.mutateAsync({
            title: meta?.title ?? hostnameOf(normalized),
            url: normalized,
            variant: "classic",
            imageUrl: meta?.imageUrl ?? null,
          });
          setOpen(false);
          reset();
          onCreated(created.id);
        } catch (mutationError) {
          setError(
            mutationError instanceof Error
              ? mutationError.message
              : "Adding this link failed. Try again.",
          );
        }
      });
    },
  });

  function addItem(handle: string) {
    if (!selected) return;
    const url = selected.buildUrl(handle);
    if (!url) {
      setError(
        selected.hint ??
          `Enter a valid ${selected.label.toLowerCase()} ${selected.placeholder}.`,
      );
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const created = await create.mutateAsync({
          title: selected.label,
          url,
          variant: "classic",
          imageUrl: null,
          platform: selected.platform,
        });
        setOpen(false);
        reset();
        onCreated(created.id);
      } catch (mutationError) {
        setError(
          mutationError instanceof Error
            ? mutationError.message
            : "Adding this failed. Try again.",
        );
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) reset();
      }}
    >
      <DialogTrigger render={<Button size="sm" />}>
        <PlusIcon />
        Add
      </DialogTrigger>
      <DialogContent className="grid-cols-[minmax(0,1fr)] sm:max-w-2xl sm:min-w-xl">
        <DialogHeader>
          <DialogTitle>Add a link</DialogTitle>
        </DialogHeader>

        <form.Field
          name="query"
          validators={{
            onChangeAsyncDebounceMs: 400,
            onChangeAsync: async ({ value }) => {
              const trimmed = value.trim();
              if (!isLinkLike(trimmed)) {
                setMeta(null);
                return undefined;
              }
              const normalized = normalizeUrl(trimmed);
              if (!linkUrlSchema.safeParse(normalized).success) {
                setMeta(null);
                return undefined;
              }
              const metadata = await fetchUrlMetadata({ url: normalized });
              setMeta(
                "error" in metadata
                  ? null
                  : {
                      title: metadata.title,
                      imageUrl: metadata.imageUrl,
                      url: normalized,
                    },
              );
              return undefined;
            },
          }}
        >
          {(field) => {
            const query = field.state.value.trim();
            const isUrl = isLinkLike(query);
            const music = isUrl ? parseMusicUrl(normalizeUrl(query)) : null;
            const video = music || !isUrl ? null : parseVideoUrl(normalizeUrl(query));
            const embed =
              music || video || !isUrl ? null : parseEmbedUrl(normalizeUrl(query));
            const results = query
              ? CATALOG.filter((item) =>
                  item.label.toLowerCase().includes(query.toLowerCase()),
                )
              : CATALOG.filter((item) => item.category === category);

            return (
              <div className="flex min-w-0 flex-col gap-3">
                {!selected && (
                  <form
                    noValidate
                    onSubmit={(event) => {
                      event.preventDefault();
                      if (isUrl) form.handleSubmit();
                    }}
                  >
                    <InputGroup>
                      <InputGroupAddon align="inline-start">
                        <MagnifyingGlassIcon />
                      </InputGroupAddon>
                      <InputGroupInput
                        ref={searchRef}
                        value={field.state.value}
                        onChange={(event) => field.handleChange(event.target.value)}
                        autoComplete="off"
                        spellCheck={false}
                        placeholder="Paste a link or search..."
                        aria-label="Link URL or search"
                      />
                      {field.state.meta.isValidating && (
                        <InputGroupAddon align="inline-end">
                          <Spinner />
                        </InputGroupAddon>
                      )}
                    </InputGroup>
                  </form>
                )}

                {!selected && isUrl && (
                  <AddLinkUrlPreview
                    meta={meta}
                    query={query}
                    validating={field.state.meta.isValidating}
                    pending={pending}
                    hint={music ? "music" : video ? "video" : embed ? "embed" : null}
                    error={error}
                    onAdd={() => form.handleSubmit()}
                  />
                )}

                <div className="flex min-w-0 flex-col gap-4 sm:flex-row">
                  {!query && !selected ? (
                    <>
                      <ScrollArea className="scroll-fade-10 **:data-[slot=scroll-area-viewport]:scroll-fade-x min-w-0 px-2 sm:hidden">
                        <nav className="flex w-max gap-2 pb-3">
                          {CATEGORIES.map((entry) => (
                            <button
                              key={entry.id}
                              type="button"
                              onClick={() => setCategory(entry.id)}
                              aria-current={category === entry.id || undefined}
                              className={
                                category === entry.id
                                  ? "bg-accent text-accent-foreground rounded-lg px-2 py-1.5 text-left text-sm font-medium whitespace-nowrap"
                                  : "text-muted-foreground hover:bg-accent focus-visible:ring-ring/30 rounded-lg px-2 py-1.5 text-left text-sm whitespace-nowrap transition-colors focus-visible:ring-3 focus-visible:outline-none"
                              }
                            >
                              {entry.label}
                            </button>
                          ))}
                        </nav>
                        <ScrollBar
                          orientation="horizontal"
                          className="opacity-0 transition-opacity duration-200 focus-within:opacity-100 hover:opacity-100 data-hovering:opacity-100 data-scrolling:opacity-100"
                        />
                      </ScrollArea>
                      <nav className="hidden sm:flex sm:w-20 sm:shrink-0 sm:flex-col sm:gap-2">
                        {CATEGORIES.map((entry) => (
                          <button
                            key={entry.id}
                            type="button"
                            onClick={() => setCategory(entry.id)}
                            aria-current={category === entry.id || undefined}
                            className={
                              category === entry.id
                                ? "bg-accent text-accent-foreground rounded-lg px-2 py-1.5 text-left text-sm font-medium"
                                : "text-muted-foreground hover:bg-accent focus-visible:ring-ring/30 rounded-lg px-2 py-1.5 text-left text-sm transition-colors focus-visible:ring-3 focus-visible:outline-none"
                            }
                          >
                            {entry.label}
                          </button>
                        ))}
                      </nav>
                    </>
                  ) : null}

                  <div className="flex min-w-0 flex-1 flex-col gap-3">
                    {selected ? (
                      <AddLinkItemForm
                        selected={selected}
                        pending={pending}
                        error={error}
                        onBack={() => {
                          setSelected(null);
                          setError(null);
                        }}
                        onSubmitHeading={addHeading}
                        onSubmitItem={addItem}
                        onAddMusicResult={addMusicResult}
                      />
                    ) : (
                      results.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setSelected(item);
                            setError(null);
                          }}
                          className="hover:bg-accent focus-visible:ring-ring/30 flex items-center gap-3 rounded-xl px-2 py-2 text-left text-sm transition-colors focus-visible:ring-3 focus-visible:outline-none"
                        >
                          <span className="border-input inline-flex size-9 items-center justify-center rounded-full border">
                            {item.platform ? (
                              <SocialIcon id={item.platform} className="size-4" />
                            ) : (
                              <CategoryIcon item={item} />
                            )}
                          </span>
                          <span className="flex flex-col">
                            <span className="font-medium">{item.label}</span>
                            <span className="text-muted-foreground text-xs capitalize">
                              {item.tagline}
                            </span>
                          </span>
                        </button>
                      ))
                    )}
                    {!selected && !isUrl && results.length === 0 && query ? (
                      // A pasted non-URL can be arbitrarily long, so the
                      // message clamps instead of wrapping into a wall.
                      <p className="text-muted-foreground line-clamp-2 px-2 py-4 text-sm">
                        No types match “{query}”. Paste a full URL instead.
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          }}
        </form.Field>
      </DialogContent>
    </Dialog>
  );
}

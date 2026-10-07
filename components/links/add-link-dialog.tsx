"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { AppleMusicResult } from "@/lib/apple-music";
import {
  AppleLogoIcon,
  CalendarIcon,
  CaretLeftIcon,
  LinkSimpleIcon,
  ListChecksIcon,
  MagnifyingGlassIcon,
  MapTrifoldIcon,
  MusicNoteIcon,
  PlusIcon,
  SoundcloudLogoIcon,
  SpotifyLogoIcon,
  TextTIcon,
  TelegramLogoIcon,
  VideoCameraIcon,
  WhatsappLogoIcon,
  YoutubeLogoIcon,
} from "@phosphor-icons/react";
import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";

import { searchAppleMusic } from "@/app/actions/apple-music";
import { createSectionHeading, fetchUrlMetadata } from "@/app/actions/links";
import { SocialIcon } from "@/components/social-icon";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
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
import { CATALOG, CATEGORIES, type CatalogItem } from "@/lib/catalog";
import { parseEmbedUrl } from "@/lib/embeds";
import { linkUrlSchema, normalizeUrl } from "@/lib/links";
import { parseMusicUrl } from "@/lib/music";
import { parseVideoUrl } from "@/lib/video";
import { useCreateLink } from "./use-link-mutations";

function CategoryIcon({ item }: { item: CatalogItem }) {
  switch (item.id) {
    case "spotify":
      return <SpotifyLogoIcon className="size-4" />;
    case "apple-music":
      return <AppleLogoIcon className="size-4" />;
    case "soundcloud":
      return <SoundcloudLogoIcon className="size-4" />;
    case "youtube":
      return <YoutubeLogoIcon className="size-4" />;
    case "vimeo":
      return <VideoCameraIcon className="size-4" />;
    case "google-maps":
      return <MapTrifoldIcon className="size-4" />;
    case "google-calendar":
      return <CalendarIcon className="size-4" />;
    case "typeform":
      return <ListChecksIcon className="size-4" />;
    case "whatsapp":
      return <WhatsappLogoIcon className="size-4" />;
    case "telegram":
      return <TelegramLogoIcon className="size-4" />;
    case "heading":
      return <TextTIcon className="size-4" />;
    default:
      return <LinkSimpleIcon className="size-4" />;
  }
}

type Category = (typeof CATEGORIES)[number]["id"];

interface LinkMeta {
  title: string;
  imageUrl: string | null;
  url: string;
}

export function AddLinkDialog({
  profileId,
  onCreated,
}: {
  profileId: string;
  onCreated: (linkId: string) => void;
}) {
  const create = useCreateLink(profileId);
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<Category>("socials");
  const [selected, setSelected] = useState<CatalogItem | null>(null);
  const [handle, setHandle] = useState("");
  const [meta, setMeta] = useState<LinkMeta | null>(null);
  const [searchResults, setSearchResults] = useState<Array<AppleMusicResult>>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const searchRef = useRef<HTMLInputElement>(null);
  const handleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    (selected ? handleRef : searchRef).current?.focus();
  }, [open, selected]);

  function reset() {
    setCategory("socials");
    setSelected(null);
    setHandle("");
    setMeta(null);
    setSearchResults([]);
    setSearching(false);
    setError(null);
    form.reset();
  }

  // Spotify links can be found without a pasted URL: search the catalogue
  // live, but stand down the moment the input is cleared or looks like a URL.
  useEffect(() => {
    // Apple Music search works key-free; Spotify is paste-only until the
    // account has Premium.
    if (selected?.id !== "apple-music") {
      return;
    }
    const query = handle.trim();
    if (query.length < 2 || isLinkLike(query)) {
      return;
    }
    const timer = setTimeout(() => {
      setSearching(true);
      void (async () => {
        const result = await searchAppleMusic({ query });
        setSearchResults("error" in result ? [] : result.results);
        setSearching(false);
      })();
    }, 400);
    return () => clearTimeout(timer);
  }, [handle, selected]);

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

  function addHeading() {
    const title = handle.trim();
    if (!title) {
      setError("Give the heading some text.");
      return;
    }
    startTransition(async () => {
      const created = await createSectionHeading({ profileId, title });
      if ("error" in created) {
        setError(created.error);
        return;
      }
      setOpen(false);
      reset();
      onCreated(created.id);
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

  function addItem() {
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
        toast.error(
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
      <DialogContent className="grid-cols-[minmax(0,1fr)] sm:max-w-2xl sm:min-w-[36rem]">
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
                  <div className="flex flex-col gap-2">
                    <div className="border-input bg-card flex items-center gap-3 rounded-xl border p-3">
                      {meta?.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element -- cross-host og:image preview: the optimizer cache never earns its keep for one-off hosts
                        <img
                          src={meta.imageUrl}
                          alt=""
                          className="size-10 rounded-full object-cover ring-1 ring-black/10 dark:ring-white/10"
                        />
                      ) : (
                        <LinkSimpleIcon className="text-muted-foreground size-5" />
                      )}
                      <div className="flex min-w-0 flex-1 flex-col">
                        {field.state.meta.isValidating && !meta ? (
                          <span className="text-muted-foreground text-sm">
                            Loading preview…
                          </span>
                        ) : (
                          <span className="truncate text-sm font-medium">
                            {meta?.title ?? query}
                          </span>
                        )}
                        {meta ? (
                          <span className="text-muted-foreground truncate text-xs">
                            {query}
                          </span>
                        ) : null}
                      </div>
                      <Button
                        size="sm"
                        onClick={() => form.handleSubmit()}
                        disabled={pending}
                      >
                        Add
                      </Button>
                    </div>
                    {music ? (
                      <p className="text-muted-foreground px-1 text-xs">
                        Music link — your profile will play it inline.
                      </p>
                    ) : video ? (
                      <p className="text-muted-foreground px-1 text-xs">
                        Video link — your profile will play it inline.
                      </p>
                    ) : embed ? (
                      <p className="text-muted-foreground px-1 text-xs">
                        Web link — your profile will render it inline.
                      </p>
                    ) : null}
                    {error ? (
                      <p className="text-destructive px-1 text-sm">{error}</p>
                    ) : null}
                  </div>
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
                          className="opacity-0 transition-opacity duration-200 focus-within:opacity-100 hover:opacity-100 data-[hovering]:opacity-100 data-[scrolling]:opacity-100"
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
                      selected.id === "heading" ? (
                        <form
                          noValidate
                          className="flex flex-col gap-3"
                          onSubmit={(event) => {
                            event.preventDefault();
                            addHeading();
                          }}
                        >
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelected(null);
                              setHandle("");
                              setError(null);
                            }}
                            className="self-start"
                          >
                            <CaretLeftIcon />
                            Back
                          </Button>
                          <InputGroup>
                            <InputGroupAddon align="inline-start">
                              <TextTIcon />
                            </InputGroupAddon>
                            <InputGroupInput
                              ref={handleRef}
                              value={handle}
                              onChange={(event) => setHandle(event.target.value)}
                              placeholder="Section title"
                              aria-label="Heading text"
                            />
                          </InputGroup>
                          {error ? (
                            <p className="text-destructive text-sm">{error}</p>
                          ) : null}
                          <DialogFooter>
                            <Button type="submit" disabled={pending}>
                              {pending && <Spinner />}
                              Add heading
                            </Button>
                          </DialogFooter>
                        </form>
                      ) : (
                        <form
                          noValidate
                          className="flex flex-col gap-3"
                          onSubmit={(event) => {
                            event.preventDefault();
                            addItem();
                          }}
                        >
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelected(null);
                              setHandle("");
                              setSearchResults([]);
                              setSearching(false);
                              setError(null);
                            }}
                            className="self-start"
                          >
                            <CaretLeftIcon />
                            Back
                          </Button>
                          <InputGroup>
                            <InputGroupAddon align="inline-start">
                              {selected.platform ? (
                                <SocialIcon id={selected.platform} />
                              ) : (
                                <CategoryIcon item={selected} />
                              )}
                            </InputGroupAddon>
                            <InputGroupInput
                              ref={handleRef}
                              value={handle}
                              onChange={(event) => {
                                setHandle(event.target.value);
                                // Stale results belong to the previous query; the
                                // effect re-populates only when the debounce fires.
                                setSearchResults([]);
                                setSearching(false);
                              }}
                              placeholder={
                                selected.id === "apple-music"
                                  ? `Search ${selected.label} or paste a link`
                                  : selected.placeholder
                              }
                              aria-label={selected.label}
                            />
                            {searching ? (
                              <InputGroupAddon align="inline-end">
                                <Spinner />
                              </InputGroupAddon>
                            ) : null}
                          </InputGroup>
                          {selected?.id === "apple-music" && searchResults.length > 0 ? (
                            <ul className="border-input flex max-h-64 flex-col overflow-y-auto rounded-xl border">
                              {searchResults.map((result) => (
                                <li key={`${result.type}-${result.id}`}>
                                  <button
                                    type="button"
                                    onClick={() => addMusicResult(result)}
                                    className="hover:bg-accent flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors"
                                  >
                                    {result.imageUrl ? (
                                      // eslint-disable-next-line @next/next/no-img-element -- transient search preview: next/image adds nothing for a thumbnail shown for a moment
                                      <img
                                        src={result.imageUrl}
                                        alt=""
                                        className="size-10 rounded-md object-cover"
                                      />
                                    ) : (
                                      <span className="bg-muted grid size-10 place-items-center rounded-md">
                                        <MusicNoteIcon className="size-4" />
                                      </span>
                                    )}
                                    <span className="min-w-0 flex-1">
                                      <span className="block truncate font-medium">
                                        {result.title}
                                      </span>
                                      <span className="text-muted-foreground block truncate text-xs">
                                        {result.subtitle}
                                      </span>
                                    </span>
                                    <span className="text-muted-foreground text-xs capitalize">
                                      {result.type}
                                    </span>
                                  </button>
                                </li>
                              ))}
                            </ul>
                          ) : null}
                          {error ? (
                            <p className="text-destructive text-sm">{error}</p>
                          ) : null}
                          <DialogFooter>
                            <Button type="submit" disabled={pending}>
                              {pending && <Spinner />}
                              Add {selected.label}
                            </Button>
                          </DialogFooter>
                        </form>
                      )
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
                      <p className="text-muted-foreground px-2 py-4 text-sm">
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

function isLinkLike(input: string): boolean {
  const normalized = normalizeUrl(input.trim());
  if (!linkUrlSchema.safeParse(normalized).success) return false;
  try {
    const url = new URL(normalized);
    if (url.protocol === "mailto:" || url.protocol === "tel:") return true;
    return url.hostname.includes(".");
  } catch {
    return false;
  }
}

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "") || url;
  } catch {
    return url;
  }
}

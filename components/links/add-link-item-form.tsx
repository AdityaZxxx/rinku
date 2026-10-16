"use client";

import { useEffect, useRef, useState } from "react";
import type { AppleMusicResult } from "@/lib/links/apple-music";
import type { CatalogItem } from "@/lib/links/catalog";
import {
  AppleLogoIcon,
  CalendarIcon,
  CaretLeftIcon,
  LinkSimpleIcon,
  ListChecksIcon,
  MapTrifoldIcon,
  MusicNoteIcon,
  SoundcloudLogoIcon,
  SpotifyLogoIcon,
  TextTIcon,
  TelegramLogoIcon,
  VideoCameraIcon,
  WhatsappLogoIcon,
  YoutubeLogoIcon,
} from "@phosphor-icons/react";

import { searchAppleMusic } from "@/app/actions/apple-music";
import { SocialIcon } from "@/components/social-icon";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Spinner } from "@/components/ui/spinner";
import { useSrcImageFailure } from "@/components/use-image-failure";
import { HEADING_TITLE_MAX, isLinkLike } from "@/lib/links/model";
import { useHeadingLimitNotice } from "./use-heading-limit-notice";

export function CategoryIcon({ item }: { item: CatalogItem }) {
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

/**
 * A transient search-result thumbnail from Apple's CDN. Remote artwork fails
 * to load like any cross-host image, and a broken glyph inside search
 * results reads as a defect, so it falls back to the music note.
 */
function ResultImage({ src }: { src: string }) {
  const [broken, onFailed, failedRef] = useSrcImageFailure(src);
  if (broken) {
    return (
      <span className="bg-muted grid size-10 place-items-center rounded-md">
        <MusicNoteIcon className="size-4" />
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- transient search preview: next/image adds nothing for a thumbnail shown for a moment
    <img
      ref={failedRef}
      src={src}
      alt=""
      onError={onFailed}
      className="size-10 rounded-md object-cover"
    />
  );
}

/**
 * The per-item form shown once a catalog entry is picked: either the heading
 * form or the platform form with its Apple Music search results. It owns the
 * handle input and the live music search; submits and their mutations stay
 * with the dialog shell. Unmounting (back, close, or after add) resets it.
 */
export function AddLinkItemForm({
  selected,
  pending,
  error,
  onBack,
  onSubmitHeading,
  onSubmitItem,
  onAddMusicResult,
}: {
  selected: CatalogItem;
  pending: boolean;
  error: string | null;
  onBack: () => void;
  onSubmitHeading: (title: string) => void;
  onSubmitItem: (handle: string) => void;
  onAddMusicResult: (result: AppleMusicResult) => void;
}) {
  const limit = useHeadingLimitNotice();
  const [handle, setHandle] = useState("");
  const [searchResults, setSearchResults] = useState<Array<AppleMusicResult>>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const handleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    handleRef.current?.focus();
  }, []);

  // Spotify links can be found without a pasted URL: search the catalogue
  // live, but stand down the moment the input is cleared or looks like a URL.
  useEffect(() => {
    // Apple Music search works key-free; Spotify is paste-only until the
    // account has Premium.
    if (selected.id !== "apple-music") {
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
        setSearchError("error" in result ? result.error : null);
        setSearching(false);
      })();
    }, 400);
    return () => clearTimeout(timer);
  }, [handle, selected]);

  return (
    <>
      {selected.id === "heading" ? (
        <form
          noValidate
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmitHeading(handle.trim());
          }}
        >
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onBack}
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
              onKeyDown={limit.onKeyDown}
              onPaste={limit.onPaste}
              onBlur={limit.dismiss}
              placeholder="Section title"
              aria-label="Heading text"
              maxLength={HEADING_TITLE_MAX}
            />
            {limit.atLimit ? (
              <InputGroupAddon align="inline-end">
                <span aria-live="polite" className="text-foreground text-xs font-medium">
                  Max {HEADING_TITLE_MAX}
                </span>
              </InputGroupAddon>
            ) : null}
          </InputGroup>
          {error ? <p className="text-destructive text-sm">{error}</p> : null}
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
            onSubmitItem(handle);
          }}
        >
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onBack}
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
                setSearchError(null);
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
          {selected.id === "apple-music" && searchError ? (
            <p className="text-destructive px-1 text-sm">{searchError}</p>
          ) : null}
          {selected.id === "apple-music" && searchResults.length > 0 ? (
            <ul className="border-input flex max-h-64 flex-col overflow-y-auto rounded-xl border">
              {searchResults.map((result) => (
                <li key={`${result.type}-${result.id}`}>
                  <button
                    type="button"
                    onClick={() => onAddMusicResult(result)}
                    className="hover:bg-accent flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors"
                  >
                    {result.imageUrl ? (
                      <ResultImage src={result.imageUrl} />
                    ) : (
                      <span className="bg-muted grid size-10 place-items-center rounded-md">
                        <MusicNoteIcon className="size-4" />
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{result.title}</span>
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
          {error ? <p className="text-destructive text-sm">{error}</p> : null}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending && <Spinner />}
              Add {selected.label}
            </Button>
          </DialogFooter>
        </form>
      )}
    </>
  );
}

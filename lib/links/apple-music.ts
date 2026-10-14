import * as z from "zod";

const SEARCH_URL = "https://itunes.apple.com/search";

export interface AppleMusicResult {
  type: "track" | "album";
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string | null;
  url: string;
}

// Only the fields the mapping below reads; everything else the API sends is
// ignored, and a malformed body degrades to an empty result list.
const itunesTrackSchema = z.object({
  trackId: z.number().optional(),
  trackName: z.string().optional(),
  artistName: z.string().optional(),
  trackViewUrl: z.string().optional(),
  artworkUrl100: z.string().optional(),
});

const itunesAlbumSchema = z.object({
  collectionId: z.number().optional(),
  collectionName: z.string().optional(),
  artistName: z.string().optional(),
  collectionViewUrl: z.string().optional(),
  artworkUrl100: z.string().optional(),
});

const songFeedSchema = z.object({ results: z.array(itunesTrackSchema).optional() });
const albumFeedSchema = z.object({ results: z.array(itunesAlbumSchema).optional() });

/** Bigger artwork than the API's 100px thumb; the public page shows square covers. */
function artwork(url: string | undefined): string | null {
  return url ? url.replace("100x100bb", "600x600bb") : null;
}

// The iTunes Search API needs no key and mirrors Apple Music's catalogue;
// that is Apple Music search without a developer account. A non-OK response
// or a malformed body degrades to null, which the caller reads as no results.
async function fetchFeed<T>(
  url: URL,
  schema: z.ZodType<{ results?: T[] }>,
): Promise<{ results?: T[] } | null> {
  try {
    const response = await fetch(url, { next: { revalidate: 60 } });
    if (!response.ok) {
      return null;
    }
    return schema.parse(await response.json());
  } catch {
    return null;
  }
}
export async function searchAppleMusicLibrary(
  query: string,
): Promise<AppleMusicResult[] | null> {
  const make = (entity: "song" | "album") => {
    const url = new URL(SEARCH_URL);
    url.searchParams.set("term", query);
    url.searchParams.set("media", "music");
    url.searchParams.set("entity", entity);
    url.searchParams.set("limit", "5");
    url.searchParams.set("country", "us");
    return url;
  };

  const [songs, albums] = await Promise.all([
    fetchFeed(make("song"), songFeedSchema),
    fetchFeed(make("album"), albumFeedSchema),
  ]);
  if (!songs && !albums) {
    return null;
  }

  const results: AppleMusicResult[] = [];
  for (const track of songs?.results ?? []) {
    if (!track.trackId || !track.trackName || !track.trackViewUrl) {
      continue;
    }
    results.push({
      type: "track",
      id: String(track.trackId),
      title: track.trackName,
      subtitle: track.artistName ?? "",
      imageUrl: artwork(track.artworkUrl100),
      url: track.trackViewUrl,
    });
  }
  for (const album of albums?.results ?? []) {
    if (!album.collectionId || !album.collectionName || !album.collectionViewUrl) {
      continue;
    }
    results.push({
      type: "album",
      id: String(album.collectionId),
      title: album.collectionName,
      subtitle: album.artistName ?? "",
      imageUrl: artwork(album.artworkUrl100),
      url: album.collectionViewUrl,
    });
  }
  return results;
}

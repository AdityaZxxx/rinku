const SEARCH_URL = "https://itunes.apple.com/search";

export interface AppleMusicResult {
  type: "track" | "album";
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string | null;
  url: string;
}

interface ItunesTrack {
  trackId?: number;
  trackName?: string;
  artistName?: string;
  kind?: string;
  trackViewUrl?: string;
  artworkUrl100?: string;
}

interface ItunesAlbum {
  collectionId?: number;
  collectionName?: string;
  artistName?: string;
  collectionViewUrl?: string;
  artworkUrl100?: string;
}

/** Bigger artwork than the API's 100px thumb; the public page shows square covers. */
function artwork(url: string | undefined): string | null {
  return url ? url.replace("100x100bb", "600x600bb") : null;
}

// The iTunes Search API needs no key and mirrors Apple Music's catalogue;
// that is Apple Music search without a developer account.
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
    // SAFETY: every field read below is optional and guarded, so a malformed
    // body degrades to an empty result list instead of throwing.
    fetch(make("song"), { next: { revalidate: 60 } })
      .then((res) => (res.ok ? res.json() : null))
      .catch(() => null) as Promise<{ results?: ItunesTrack[] } | null>,
    // SAFETY: same as above — optional fields, guarded below.
    fetch(make("album"), { next: { revalidate: 60 } })
      .then((res) => (res.ok ? res.json() : null))
      .catch(() => null) as Promise<{ results?: ItunesAlbum[] } | null>,
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

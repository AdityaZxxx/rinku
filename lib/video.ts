import * as z from "zod";

/** Typed metadata for "video" links. Stored in links.metadata once at write
 * time, so the public page renders the embed without re-parsing URLs. */

export type VideoProvider = "youtube" | "vimeo";

export const blockEmbedStyleSchema = z.enum(["embed", "classic", "featured"]);

export type BlockEmbedStyle = z.infer<typeof blockEmbedStyleSchema>;

export interface YouTubeMetadata {
  provider: "youtube";
  id: string;
  style?: BlockEmbedStyle;
}

export interface VimeoMetadata {
  provider: "vimeo";
  id: string;
  style?: BlockEmbedStyle;
}

export type VideoMetadata = YouTubeMetadata | VimeoMetadata;

export const videoMetadataSchema = z.discriminatedUnion("provider", [
  z.object({
    provider: z.literal("youtube"),
    id: z.string(),
    style: blockEmbedStyleSchema.optional(),
  }),
  z.object({
    provider: z.literal("vimeo"),
    id: z.string(),
    style: blockEmbedStyleSchema.optional(),
  }),
]);

/** Parse a user-pasted URL into video metadata, or null when it is not video. */
export function parseVideoUrl(url: string): VideoMetadata | null {
  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return null;
  }

  const host = parsed.hostname
    .replace(/^www\./, "")
    .replace(/^m\./, "")
    .toLowerCase();

  if (
    host === "youtube.com" ||
    host === "music.youtube.com" ||
    host === "youtube-nocookie.com"
  ) {
    // /watch?v=, /shorts/<id>, /embed/<id>, /live/<id>
    const segments = parsed.pathname.split("/").filter(Boolean);
    const fromPath =
      segments[0] === "shorts" || segments[0] === "embed" || segments[0] === "live"
        ? segments[1]
        : undefined;
    const fromQuery = parsed.searchParams.get("v");
    const id = fromQuery ?? fromPath;
    if (id && /^[\w-]{6,20}$/.test(id)) {
      return { provider: "youtube", id };
    }
    return null;
  }

  if (host === "youtu.be") {
    const id = parsed.pathname.split("/").find((segment) => segment.length > 0);
    if (id && /^[\w-]{6,20}$/.test(id)) {
      return { provider: "youtube", id };
    }
    return null;
  }

  if (host === "vimeo.com") {
    const id = parsed.pathname.split("/").find((segment) => segment.length > 0);
    if (id && /^\d+$/.test(id)) {
      return { provider: "vimeo", id };
    }
    return null;
  }

  if (host === "player.vimeo.com") {
    const segments = parsed.pathname.split("/").filter(Boolean);
    if (segments[0] === "video" && segments[1] && /^\d+$/.test(segments[1])) {
      return { provider: "vimeo", id: segments[1] };
    }
  }

  return null;
}

/** The iframe src for a video link. Renderers size it with aspect-video. */
export function videoEmbed(metadata: VideoMetadata): string {
  switch (metadata.provider) {
    case "youtube":
      return `https://www.youtube.com/embed/${metadata.id}?rel=0&playsinline=1`;
    case "vimeo":
      return `https://player.vimeo.com/video/${metadata.id}`;
  }
}

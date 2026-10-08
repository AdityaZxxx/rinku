import { musicEmbed, type LinkMetadata } from "@/lib/links/music";

/** In-place player for a music link: the reason kind === "music" exists. */
export function MusicEmbed({ metadata }: { metadata: LinkMetadata }) {
  const embed = musicEmbed(metadata);
  // Matches the official vendor embed snippets: no sandbox attribute, since
  // the hosted players need same-origin + scripts to run at all.
  return (
    <iframe
      src={embed.src}
      width="100%"
      height={embed.height}
      loading="lazy"
      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
      className="w-full overflow-hidden rounded-xl border-0"
      title="Music player"
    />
  );
}

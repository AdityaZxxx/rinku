import { embedSpec, type EmbedMetadata } from "@/lib/embeds";

/** Generic iframe for the smaller embed providers (maps, calendar, forms). */
export function BlockEmbed({ metadata }: { metadata: EmbedMetadata }) {
  const spec = embedSpec(metadata);
  return (
    <iframe
      src={spec.src}
      width="100%"
      height={spec.height}
      loading="lazy"
      allow="clipboard-write; fullscreen; picture-in-picture"
      allowFullScreen
      className="w-full rounded-xl border-0"
      title="Embedded block"
    />
  );
}

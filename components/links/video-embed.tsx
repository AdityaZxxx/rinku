import { videoEmbed, type VideoMetadata } from "@/lib/video";

/** Inline player for a video link, like MusicEmbed but 16:9. */
export function VideoEmbed({ metadata }: { metadata: VideoMetadata }) {
  return (
    <div className="aspect-video w-full overflow-hidden rounded-xl">
      <iframe
        src={videoEmbed(metadata)}
        width="100%"
        height="100%"
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="size-full border-0"
        title="Video player"
      />
    </div>
  );
}

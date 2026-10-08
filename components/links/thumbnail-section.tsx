"use client";

import { useRef, useState, useTransition } from "react";
import type { Link } from "@/lib/db/schema";
import { ImageIcon } from "@phosphor-icons/react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { uploadLinkImage } from "@/app/actions/links";
import { MediaIcon, MEDIA_ICON_IDS } from "@/components/media-icon";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { isIconMedia } from "@/lib/links/media";
import { useUpdateLink } from "./use-link-mutations";

export function ThumbnailSection({ link }: { link: Link }) {
  const update = useUpdateLink(link.profileId);
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, startUpload] = useTransition();
  const [iconOpen, setIconOpen] = useState(false);
  const [query, setQuery] = useState("");

  function onPickImage(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const data = new FormData();
    data.set("linkId", link.id);
    data.set("file", file);
    startUpload(async () => {
      const result = await uploadLinkImage(data);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["links", link.profileId] });
      toast("Thumbnail updated");
    });
  }

  function setImageUrl(imageUrl: string) {
    update.mutate({
      id: link.id,
      title: link.title,
      url: link.url,
      variant: link.variant,
      isActive: link.isActive,
      imageUrl,
    });
  }

  const filtered = MEDIA_ICON_IDS.filter((id) =>
    id.toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium">Thumbnail</p>
      <div className="flex items-center gap-3">
        <span className="border-input bg-muted inline-flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border">
          {isIconMedia(link.imageUrl) ? (
            <MediaIcon imageUrl={link.imageUrl} className="size-5" />
          ) : link.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- cross-host thumbnail preview: the optimizer cache never earns its keep for one-off hosts
            <img src={link.imageUrl} alt="" className="size-12 object-cover" />
          ) : (
            <ImageIcon className="text-muted-foreground size-5" />
          )}
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileRef.current?.click()}
          >
            {uploading ? <Spinner /> : null}
            Change image
          </Button>
          <Dialog open={iconOpen} onOpenChange={setIconOpen}>
            <DialogTrigger render={<Button type="button" variant="outline" size="sm" />}>
              Choose icon
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Choose an icon</DialogTitle>
              </DialogHeader>
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search icons…"
                aria-label="Search icons"
              />
              <div className="grid max-h-64 grid-cols-6 gap-2 overflow-y-auto">
                {filtered.map((id) => (
                  <button
                    key={id}
                    type="button"
                    title={id}
                    onClick={() => {
                      setImageUrl(`icon:${id}`);
                      setIconOpen(false);
                    }}
                    className="hover:bg-accent focus-visible:ring-ring/30 inline-flex aspect-square items-center justify-center rounded-xl border transition-colors focus-visible:ring-3 focus-visible:outline-none"
                  >
                    <MediaIcon imageUrl={`icon:${id}`} className="size-5" />
                  </button>
                ))}
                {filtered.length === 0 ? (
                  <p className="text-muted-foreground col-span-6 py-4 text-center text-sm">
                    No icons match “{query}”.
                  </p>
                ) : null}
              </div>
            </DialogContent>
          </Dialog>
          {link.imageUrl ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setImageUrl("")}
            >
              Remove
            </Button>
          ) : null}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          className="hidden"
          onChange={onPickImage}
        />
      </div>
    </div>
  );
}

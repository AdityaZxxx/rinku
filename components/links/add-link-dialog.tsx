"use client";

import { useState, useTransition } from "react";
import { LinkSimpleIcon, PlusIcon } from "@phosphor-icons/react";
import { toast } from "sonner";

import { fetchUrlMetadata } from "@/app/actions/links";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Spinner } from "@/components/ui/spinner";
import { linkUrlSchema, normalizeUrl } from "@/lib/links";
import { useCreateLink } from "./use-link-mutations";

export function AddLinkDialog({
  profileId,
  onCreated,
}: {
  profileId: string;
  onCreated: (linkId: string) => void;
}) {
  const create = useCreateLink(profileId);
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onAdd() {
    const normalized = normalizeUrl(url);
    const parsed = linkUrlSchema.safeParse(normalized);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Enter a valid URL.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const metadata = await fetchUrlMetadata({ url: normalized });
      const title = "error" in metadata ? hostnameOf(normalized) : metadata.title;
      const imageUrl = "error" in metadata ? null : metadata.imageUrl;
      if ("error" in metadata) {
        toast.info("Couldn't fetch details for that URL — edit them below.");
      }

      try {
        const created = await create.mutateAsync({
          title,
          url: normalized,
          variant: "classic",
          imageUrl,
        });
        setOpen(false);
        setUrl("");
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

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          setUrl("");
          setError(null);
        }
      }}
    >
      <DialogTrigger render={<Button size="sm" />}>
        <PlusIcon />
        Add link
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Add a link</DialogTitle>
          <DialogDescription>
            Paste a URL and Rinku fills in the rest. Everything stays editable.
          </DialogDescription>
        </DialogHeader>

        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            onAdd();
          }}
        >
          <InputGroup>
            <InputGroupAddon align="inline-start">
              <LinkSimpleIcon />
            </InputGroupAddon>
            <InputGroupInput
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              autoComplete="off"
              spellCheck={false}
              placeholder="example.com"
              aria-invalid={Boolean(error)}
            />
          </InputGroup>
          {error && <p className="text-destructive mt-2 text-sm">{error}</p>}

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              disabled={pending}
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending || !url.trim()}>
              {pending && <Spinner />}
              Add link
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "") || url;
  } catch {
    return url;
  }
}

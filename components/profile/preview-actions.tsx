"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckIcon, CopyIcon, RocketIcon } from "@phosphor-icons/react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { profileUrl } from "@/lib/brand";
import { copyText } from "@/lib/copy";

export function PreviewActions({ username }: { username: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (!(await copyText(profileUrl(username)))) {
      toast.error("Couldn't copy the link");
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="flex flex-col gap-2">
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={copy}
              aria-label="Copy page URL"
            >
              {copied ? <CheckIcon /> : <CopyIcon />}
            </Button>
          }
        />
        <TooltipContent side="left">{copied ? "Copied" : "Copy page URL"}</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="outline"
              size="icon"
              nativeButton={false}
              render={<Link href={`/${username}`} target="_blank" />}
              aria-label="Visit live page"
            >
              <RocketIcon />
            </Button>
          }
        />
        <TooltipContent side="left">Visit live page</TooltipContent>
      </Tooltip>
    </div>
  );
}

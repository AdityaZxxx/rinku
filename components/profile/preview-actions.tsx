"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckIcon, CopyIcon, RocketIcon } from "@phosphor-icons/react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
    toast.success("Link copied to clipboard");
  }

  return (
    <div className="flex items-center justify-center gap-2">
      <Button variant="outline" size="sm" onClick={copy}>
        {copied ? <CheckIcon /> : <CopyIcon />}
        {copied ? "Copied" : "Copy URL"}
      </Button>
      <Button
        variant="outline"
        size="sm"
        nativeButton={false}
        render={<Link href={`/${username}`} target="_blank" />}
      >
        <RocketIcon />
        Visit live page
      </Button>
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { CopyIcon, RocketIcon, CheckIcon } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";

export function PreviewActions({ username }: { username: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    const origin = window.location.origin;
    try {
      await navigator.clipboard.writeText(`${origin}/${username}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
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

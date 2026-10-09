"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import {
  CaretLeftIcon,
  CheckIcon,
  CopyIcon,
  FilePngIcon,
  FileSvgIcon,
  QrCodeIcon,
  ShareIcon,
  ShareNetworkIcon,
} from "@phosphor-icons/react";
import { RabbitIcon } from "@phosphor-icons/react/dist/ssr";
import { toast } from "sonner";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { ColorPicker } from "@/components/ui/color-picker";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { profileUrl } from "@/lib/brand";
import { copyText } from "@/lib/copy";
import { displayUrl } from "@/lib/links/model";
import { type ShareTarget, SHARE_TARGETS } from "@/lib/share";

function SharePageMenu({ username }: { username: string }) {
  const [copied, setCopied] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [logo, setLogo] = useState(true);
  const [dots, setDots] = useState("#000000");
  const [background, setBackground] = useState("#ffffff");
  const url = profileUrl(username);

  const canNativeShare = typeof navigator !== "undefined" && "share" in navigator;

  function qrHref(format: "svg" | "png", download: boolean): string {
    const params = new URLSearchParams({
      logo: logo ? "1" : "0",
      color: dots.slice(1),
      background: background.slice(1),
      format,
    });
    if (download) {
      params.set("download", "1");
    }
    return `/api/qr/${username}?${params.toString()}`;
  }

  async function copy() {
    if (!(await copyText(url))) {
      toast.error("Couldn't copy the link");
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  function shareTo(target: ShareTarget) {
    const href = target.href(
      encodeURIComponent(url),
      encodeURIComponent("Check out my page"),
    );
    if (target.id === "email") {
      window.location.assign(href);
    } else {
      window.open(href, "_blank", "noopener,noreferrer");
    }
  }

  async function nativeShare() {
    try {
      await navigator.share({ title: "Check out my page", url });
    } catch {
      // User dismissed the sheet or share failed; nothing to recover.
    }
  }

  return (
    <DropdownMenu
      onOpenChange={(open) => {
        if (!open) {
          setQrOpen(false);
        }
      }}
    >
      <DropdownMenuTrigger render={<Button variant="ghost" size="sm" />}>
        <ShareIcon />
        Share
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        {qrOpen ? (
          <div className="animate-in fade-in-0 duration-150 motion-reduce:animate-none">
            <DropdownMenuItem closeOnClick={false} onClick={() => setQrOpen(false)}>
              <CaretLeftIcon />
              Back
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <div className="flex justify-center px-2 pt-1 pb-1">
              {/* eslint-disable-next-line @next/next/no-img-element -- same-host immutable SVG; the optimizer adds nothing to a route we control */}
              <img
                src={qrHref("svg", false)}
                alt={`QR code linking to ${url}`}
                className="size-40 rounded-lg border"
              />
            </div>
            <DropdownMenuSeparator />
            <div className="flex items-center justify-between gap-2 px-2 py-1.5 [&_[data-slot=popover-trigger]]:size-6">
              <div className="flex items-center gap-2 text-sm">
                <ColorPicker label="QR code dot color" value={dots} onChange={setDots} />
                <span>Dots</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <ColorPicker
                  label="QR code background color"
                  value={background}
                  onChange={setBackground}
                />
                <span>Background</span>
              </div>
            </div>
            <DropdownMenuCheckboxItem checked={logo} onCheckedChange={setLogo}>
              <RabbitIcon />
              Rinku logo
            </DropdownMenuCheckboxItem>
            <DropdownMenuSeparator />
            <div className="grid grid-cols-2 gap-2 px-2 pt-1 pb-1">
              <Button
                variant="outline"
                size="sm"
                nativeButton={false}
                render={
                  <a href={qrHref("svg", true)} aria-label="Download QR code as SVG" />
                }
              >
                <FileSvgIcon />
                SVG
              </Button>
              <Button
                variant="outline"
                size="sm"
                nativeButton={false}
                render={
                  <a href={qrHref("png", true)} aria-label="Download QR code as PNG" />
                }
              >
                <FilePngIcon />
                PNG
              </Button>
            </div>
          </div>
        ) : (
          <div className="animate-in fade-in-0 duration-150 motion-reduce:animate-none">
            <div className="px-1 pt-1">
              <button
                type="button"
                onClick={copy}
                aria-label={copied ? "Copied" : `Copy ${url} to clipboard`}
                title={copied ? "Copied" : "Copy link"}
                className="border-input hover:bg-accent focus-visible:ring-ring/30 inline-flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left transition-colors focus-visible:ring-3 focus-visible:outline-none active:translate-y-px"
              >
                <RabbitIcon className="size-4 shrink-0" />
                <span className="text-muted-foreground min-w-0 flex-1 truncate text-sm">
                  {displayUrl(url)}
                </span>
                {copied ? (
                  <CheckIcon className="size-4 shrink-0" />
                ) : (
                  <CopyIcon className="size-4 shrink-0" />
                )}
              </button>
            </div>
            <DropdownMenuSeparator />
            <ScrollArea className="scroll-fade-10 **:data-[slot=scroll-area-viewport]:scroll-fade-x min-w-0 px-2">
              <div className="flex w-max snap-x items-start gap-2 p-0.5">
                {SHARE_TARGETS.map((target) => (
                  <div key={target.id} className="flex flex-col items-center gap-1 pb-3">
                    <button
                      type="button"
                      onClick={() => shareTo(target)}
                      aria-label={`Share on ${target.label}`}
                      title={target.label}
                      className="border-input hover:bg-accent focus-visible:ring-ring/30 inline-flex size-10 items-center justify-center rounded-full border transition-colors focus-visible:ring-3 focus-visible:outline-none active:translate-y-px"
                    >
                      <target.Icon className="size-4" />
                    </button>
                    <span className="text-muted-foreground text-xs">{target.label}</span>
                  </div>
                ))}
              </div>
              <ScrollBar
                orientation="horizontal"
                className="opacity-0 transition-opacity duration-200 focus-within:opacity-100 hover:opacity-100 data-hovering:opacity-100 data-scrolling:opacity-100"
              />
            </ScrollArea>
            <DropdownMenuSeparator />
            <DropdownMenuItem closeOnClick={false} onClick={() => setQrOpen(true)}>
              <QrCodeIcon />
              QR code
            </DropdownMenuItem>
            {canNativeShare ? (
              <DropdownMenuItem onClick={nativeShare}>
                <ShareNetworkIcon />
                Share via…
              </DropdownMenuItem>
            ) : null}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Mounts only on routes carrying a username; the dashboard-level pages keep
 * the header they had.
 */
const usernameParam = z.string();

export function ShareButton() {
  const params = useParams();
  const username = usernameParam.safeParse(params.username);
  if (!username.success) {
    return null;
  }
  return <SharePageMenu username={username.data} />;
}

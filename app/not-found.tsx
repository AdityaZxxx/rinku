import type { Metadata } from "next";
import Link from "next/link";
import { RabbitIcon } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/button";
import { BRAND_NAME } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Not found",
};

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-4 text-center">
      <RabbitIcon className="text-muted-foreground size-10" aria-hidden />
      <h1 className="font-heading text-lg font-semibold">Page not found</h1>
      <p className="text-muted-foreground max-w-sm text-sm text-pretty">
        The page you are looking for does not exist. The link may be mistyped, or the page
        may have been removed.
      </p>
      <Button nativeButton={false} render={<Link href="/" />}>
        Go to {BRAND_NAME}
      </Button>
    </main>
  );
}

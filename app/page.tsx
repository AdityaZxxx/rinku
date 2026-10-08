import Link from "next/link";

import { ClaimUsernameForm } from "@/components/landing/claim-username-form";
import { Button } from "@/components/ui/button";
import { getUserId } from "@/lib/auth";
import { BRAND_NAME } from "@/lib/brand";

const year = new Date().getFullYear();

export default async function Home() {
  const userId = await getUserId();

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-border border-b">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between p-4">
          <Link href="/" className="font-heading text-lg font-semibold">
            {BRAND_NAME}
          </Link>
          <nav className="flex items-center gap-3">
            {userId ? (
              <Button
                variant="outline"
                nativeButton={false}
                render={<Link href="/dashboard" />}
              >
                Dashboard
              </Button>
            ) : (
              <>
                <Button
                  variant="ghost"
                  nativeButton={false}
                  render={<Link href="/login" />}
                >
                  Sign in
                </Button>
                <Button nativeButton={false} render={<Link href="/signup" />}>
                  Get started
                </Button>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center p-6">
        <section className="flex max-w-2xl flex-col items-center gap-6 text-center">
          <h1 className="font-heading text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            One link for everything you make and sell.
          </h1>
          <p className="text-muted-foreground text-lg text-balance">
            {BRAND_NAME} is your link-in-bio page. Collect your work, your shop, and your
            socials in one place you control.
          </p>
          <div className="flex w-full flex-col items-center gap-3">
            {userId ? (
              <Button size="lg" nativeButton={false} render={<Link href="/dashboard" />}>
                Open your dashboard
              </Button>
            ) : (
              <>
                <ClaimUsernameForm />
              </>
            )}
          </div>
        </section>
      </main>

      <footer className="border-border border-t">
        <div className="text-muted-foreground mx-auto flex w-full max-w-5xl flex-col items-center justify-between gap-6 p-4 text-sm sm:flex-row">
          <p>
            © {year} {BRAND_NAME}
          </p>
          <nav className="flex items-center gap-3">
            <Link
              href="/terms"
              className="hover:text-foreground transition-colors duration-150"
            >
              Terms
            </Link>
            <Link
              href="/privacy"
              className="hover:text-foreground transition-colors duration-150"
            >
              Privacy
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

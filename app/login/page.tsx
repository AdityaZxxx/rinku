import type { Route } from "next";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/login-form";
import { getUserId } from "@/lib/auth";

export const metadata = { title: "Sign in" };

/** `searchParams` values are typed as arrays because a key can repeat. */
function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Only ever a site-relative path. A value like `//evil.example` would be read as
 * a protocol-relative URL by the browser, turning the post-login redirect into an
 * open redirect, and `https://...` would leave the app entirely.
 */
function safeNextPath(candidate: string | undefined): Route {
  if (!candidate) return "/dashboard";
  if (!candidate.startsWith("/") || candidate.startsWith("//")) return "/dashboard";
  // SAFETY: the two guards above reject anything that is not a site-relative
  // path, so the remaining value is safe to hand to the router. It cannot be
  // narrowed further because the route union is only known for literals.
  return candidate as Route;
}

export default async function LoginPage(props: PageProps<"/login">) {
  if (await getUserId()) {
    redirect("/dashboard");
  }

  const searchParams = await props.searchParams;

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <LoginForm
        next={safeNextPath(first(searchParams.next))}
        oauthError={first(searchParams.error)}
      />
    </main>
  );
}

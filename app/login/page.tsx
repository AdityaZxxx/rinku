import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/login-form";
import { getUserId } from "@/lib/auth";
import { safeNextPath } from "@/lib/next-path";

export const metadata = { title: "Sign in" };

/** `searchParams` values are typed as arrays because a key can repeat. */
function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
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

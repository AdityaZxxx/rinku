import { redirect } from "next/navigation";

import { SignupForm } from "@/components/auth/signup-form";
import { getUserId } from "@/lib/auth";

export const metadata = {
  title: "Create an account",
};

export default async function SignupPage() {
  if (await getUserId()) {
    redirect("/dashboard");
  }

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <SignupForm />
    </main>
  );
}

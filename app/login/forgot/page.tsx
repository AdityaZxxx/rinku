import { redirect } from "next/navigation";

import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { getUserId } from "@/lib/auth";

export const metadata = { title: "Reset password" };

export default async function ForgotPasswordPage() {
  // A signed-in visitor changes their password in settings, not by email.
  if (await getUserId()) {
    redirect("/account/settings");
  }

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <ForgotPasswordForm />
    </main>
  );
}

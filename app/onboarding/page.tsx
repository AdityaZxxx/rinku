import { redirect } from "next/navigation";

import { OnboardingForm } from "@/components/auth/onboarding-form";
import { getUserId } from "@/lib/auth";

export const metadata = { title: "Create your profile" };

export default async function OnboardingPage() {
  const userId = await getUserId();
  if (!userId) {
    redirect("/login?next=%2Fonboarding");
  }

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <OnboardingForm />
    </main>
  );
}

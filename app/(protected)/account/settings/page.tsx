import { ChangePasswordSection } from "@/components/settings/change-password-section";
import { DeleteAccountSection } from "@/components/settings/delete-account-section";
import { getClaims } from "@/lib/auth";

export const metadata = { title: "Account settings" };

export default async function AccountSettingsPage() {
  const claims = await getClaims();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 p-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-lg font-medium">Account settings</h1>
        <p className="text-muted-foreground text-sm">
          Change your password or delete your account.
        </p>
      </div>
      <ChangePasswordSection />
      <DeleteAccountSection email={claims?.email ?? ""} />
    </div>
  );
}

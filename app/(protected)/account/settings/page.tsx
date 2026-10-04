import { ChangePasswordSection } from "@/components/settings/change-password-section";
import { DeleteAccountSection } from "@/components/settings/delete-account-section";
import { Field, FieldDescription } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { getClaims } from "@/lib/auth";

export const metadata = { title: "Account settings" };

export default async function AccountSettingsPage() {
  const claims = await getClaims();
  const email = claims?.email ?? "";

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 p-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-lg font-medium">Account settings</h1>
        <p className="text-muted-foreground text-sm">
          Your sign-in email, password, or delete your account.
        </p>
      </div>
      <section className="rounded-2xl border p-5">
        <div className="flex max-w-sm flex-col gap-2">
          <h2 className="text-sm font-medium">Email</h2>
          <Field>
            <Input id="email" value={email} disabled readOnly />
            <FieldDescription>Your sign-in email cannot be changed.</FieldDescription>
          </Field>
        </div>
      </section>
      <ChangePasswordSection />
      <DeleteAccountSection email={email} />
    </div>
  );
}

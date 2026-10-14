import { ChangePasswordSection } from "@/components/settings/change-password-section";
import { DeleteAccountSection } from "@/components/settings/delete-account-section";
import {
  SettingsToc,
  SettingsTocSheet,
  type SettingsTocItem,
} from "@/components/settings/settings-toc";
import { Field, FieldDescription } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { getClaims } from "@/lib/auth";

export const metadata = { title: "Account settings" };

const tocItems = [
  { id: "email", label: "Email" },
  { id: "password", label: "Password" },
  { id: "delete", label: "Delete account", destructive: true },
] satisfies SettingsTocItem[];

export default async function AccountSettingsPage() {
  const claims = await getClaims();
  const email = claims?.email ?? "";

  return (
    <>
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col p-6 lg:max-w-5xl lg:flex-row lg:gap-10">
        <div className="flex w-full min-w-0 flex-1 flex-col gap-8">
          <div className="flex flex-col gap-2">
            <h1 className="text-lg font-medium">Account settings</h1>
            <p className="text-muted-foreground text-sm">
              Your sign-in email, password, or delete your account.
            </p>
          </div>
          <section id="email" className="scroll-mt-20 rounded-2xl border p-5">
            <div className="flex max-w-sm flex-col gap-2">
              <h2 className="text-sm font-medium">Email</h2>
              <Field>
                <Input id="sign-in-email" value={email} disabled readOnly />
                <FieldDescription>Your sign-in email cannot be changed.</FieldDescription>
              </Field>
            </div>
          </section>
          <section id="password" className="scroll-mt-20">
            <ChangePasswordSection />
          </section>
          <section id="delete" className="scroll-mt-20">
            <DeleteAccountSection email={email} />
          </section>
        </div>
        <aside className="hidden w-52 shrink-0 lg:block">
          <div className="sticky top-16">
            <SettingsToc items={tocItems} />
          </div>
        </aside>
      </div>
      <SettingsTocSheet items={tocItems} />
    </>
  );
}

/**
 * Placeholder. Profile-level settings — the profile's name, handle, and bio —
 * are later work; this exists so the profile's settings route has a real
 * destination. Account-level settings live at /settings, a different scope.
 */
export const metadata = { title: "Profile settings" };

export default function ProfileSettingsPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6">
      <h1 className="text-lg font-medium">Profile settings</h1>
      <p className="text-muted-foreground text-sm">Profile settings are on the way.</p>
    </div>
  );
}

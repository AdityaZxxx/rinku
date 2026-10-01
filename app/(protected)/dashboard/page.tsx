export const metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6">
      <h1 className="text-lg font-medium">Dashboard</h1>
      <p className="text-muted-foreground text-sm">
        Your workspace overview is on the way.
      </p>
    </div>
  );
}

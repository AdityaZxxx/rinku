export const metadata = { title: "Rinku" };

export default async function PublicProfilePage({ params }: PageProps<"/[username]">) {
  const { username } = await params;

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-2 p-6">
      <h1 className="text-lg font-medium">{username}</h1>
      <p className="text-muted-foreground text-sm">
        This Rinku page is under construction.
      </p>
    </main>
  );
}

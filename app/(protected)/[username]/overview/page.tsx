import Link from "next/link";
import { notFound } from "next/navigation";

import { getUserId } from "@/lib/auth";
import { getProfileSnapshots } from "@/lib/db/overview";
import { getProfileByUsername } from "@/lib/db/profile";

export const metadata = { title: "Overview" };

export default async function ProfileOverviewPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const userId = await getUserId();
  if (!userId) {
    notFound();
  }

  const profile = await getProfileByUsername(userId, username);
  if (!profile || profile.userId !== userId) {
    notFound();
  }

  const snapshots = await getProfileSnapshots(userId);
  const snapshot = snapshots.find((row) => row.id === profile.id);
  if (!snapshot) {
    notFound();
  }

  const clickRate =
    snapshot.visits30d > 0
      ? Math.round((snapshot.clicks30d / snapshot.visits30d) * 100)
      : 0;

  const nudges: string[] = [];
  if (snapshot.activeLinks === 0) {
    nudges.push("No live links yet. Add at least one so visitors have somewhere to go.");
  }
  if (!snapshot.hasAvatar) {
    nudges.push("Add an avatar on the Profile page.");
  }
  if (!snapshot.hasBanner) {
    nudges.push("Add a banner on the Profile page.");
  }
  if (!snapshot.hasBio) {
    nudges.push("Add a bio on the Profile page.");
  }
  if (snapshot.totalLinks > 0 && snapshot.hiddenLinks > snapshot.activeLinks) {
    nudges.push(
      `${snapshot.hiddenLinks} hidden links. Unhide or archive them from Links.`,
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-4 sm:p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-lg font-medium">Overview</h1>
        <p className="text-muted-foreground text-sm">
          /{profile.username} at a glance. Full trends appear in{" "}
          <Link
            href={`/${profile.username}/insights`}
            className="text-foreground underline"
          >
            Insights
          </Link>
          .
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1 rounded-lg border p-4">
          <span className="text-2xl font-semibold tabular-nums">
            {snapshot.visits30d}
          </span>
          <span className="text-muted-foreground text-sm">Visits in 30 days</span>
        </div>
        <div className="flex flex-col gap-1 rounded-lg border p-4">
          <span className="text-2xl font-semibold tabular-nums">
            {snapshot.clicks30d}
          </span>
          <span className="text-muted-foreground text-sm">Clicks in 30 days</span>
        </div>
        <div className="flex flex-col gap-1 rounded-lg border p-4">
          <span className="text-2xl font-semibold tabular-nums">{clickRate}%</span>
          <span className="text-muted-foreground text-sm">Click rate</span>
        </div>
      </div>

      <div className="flex items-center gap-6 text-sm">
        <span>
          <span className="font-semibold tabular-nums">{snapshot.activeLinks}</span>{" "}
          active
        </span>
        <span>
          <span className="font-semibold tabular-nums">{snapshot.hiddenLinks}</span>{" "}
          hidden
        </span>
        <span>
          <span className="font-semibold tabular-nums">{snapshot.archivedLinks}</span>{" "}
          archived
        </span>
      </div>

      {nudges.length > 0 ? (
        <div className="flex flex-col gap-2 rounded-lg border p-4">
          <h2 className="text-sm font-medium">To do</h2>
          <ul className="text-muted-foreground list-inside list-disc text-sm">
            {nudges.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">
          Everything looks good. Keep adding links and sharing your page.
        </p>
      )}
    </div>
  );
}

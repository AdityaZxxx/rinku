import Link from "next/link";
import { notFound } from "next/navigation";

import { SetupChecklist } from "@/components/overview/setup-checklist";
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

  // The checklist covers the first-run setup nudges; this one stays because it
  // applies at any stage and isn't a checklist item.
  const hiddenNudge =
    snapshot.totalLinks > 0 && snapshot.hiddenLinks > snapshot.activeLinks
      ? `${snapshot.hiddenLinks} hidden links. Unhide or archive them from Links.`
      : null;

  const setupComplete =
    snapshot.activeLinks > 0 &&
    snapshot.hasAvatar &&
    snapshot.hasBanner &&
    snapshot.hasBio;

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

      <SetupChecklist
        profileId={profile.id}
        username={profile.username}
        hasLiveLink={snapshot.activeLinks > 0}
        hasAvatar={snapshot.hasAvatar}
        hasBanner={snapshot.hasBanner}
        hasBio={snapshot.hasBio}
      />

      {hiddenNudge ? (
        <p className="text-muted-foreground text-sm">{hiddenNudge}</p>
      ) : null}

      {setupComplete && !hiddenNudge ? (
        <p className="text-muted-foreground text-sm">
          Everything looks good. Keep adding links and sharing your page.
        </p>
      ) : null}
    </div>
  );
}

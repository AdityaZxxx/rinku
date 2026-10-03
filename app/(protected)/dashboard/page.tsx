import Link from "next/link";
import { notFound } from "next/navigation";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getUserId } from "@/lib/auth";
import { getProfileSnapshots } from "@/lib/db/overview";
import { avatarUrl } from "@/lib/storage";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const userId = await getUserId();
  if (!userId) {
    notFound();
  }

  const snapshots = await getProfileSnapshots(userId);
  const totalClicks = snapshots.reduce((sum, s) => sum + s.clicks30d, 0);
  const totalVisits = snapshots.reduce((sum, s) => sum + s.visits30d, 0);
  const totalActive = snapshots.reduce((sum, s) => sum + s.activeLinks, 0);

  const attention = snapshots.filter(
    (s) => s.activeLinks === 0 || !s.hasAvatar || !s.hasBanner || !s.hasBio,
  );

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-4 sm:p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-lg font-medium">Dashboard</h1>
        <p className="text-muted-foreground text-sm">
          Every profile you own, in one place.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1 rounded-lg border p-4">
          <span className="text-2xl font-semibold tabular-nums">{snapshots.length}</span>
          <span className="text-muted-foreground text-sm">Profiles</span>
        </div>
        <div className="flex flex-col gap-1 rounded-lg border p-4">
          <span className="text-2xl font-semibold tabular-nums">{totalActive}</span>
          <span className="text-muted-foreground text-sm">Active links</span>
        </div>
        <div className="flex flex-col gap-1 rounded-lg border p-4">
          <span className="text-2xl font-semibold tabular-nums">{totalVisits}</span>
          <span className="text-muted-foreground text-sm">Visits in 30 days</span>
        </div>
      </div>

      {snapshots.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No profiles yet. Complete onboarding to create one.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {snapshots.map((profile) => (
            <Link
              key={profile.id}
              href={`/${profile.username}/overview`}
              className="hover:bg-accent/50 flex items-center gap-4 rounded-xl border p-4 transition"
            >
              <Avatar className="size-12">
                <AvatarImage
                  src={profile.avatarPath ? avatarUrl(profile.avatarPath) : undefined}
                />
                <AvatarFallback>
                  {profile.username.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-medium">
                  {profile.displayName ?? profile.username}
                </span>
                <span className="text-muted-foreground text-xs">/{profile.username}</span>
                <div className="text-muted-foreground mt-1 flex gap-3 text-xs tabular-nums">
                  <span>{profile.clicks30d} clicks</span>
                  <span>{profile.visits30d} visits</span>
                  <span>{profile.activeLinks} links</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {attention.length > 0 ? (
        <div className="flex flex-col gap-2 rounded-lg border p-4">
          <h2 className="text-sm font-medium">Needs attention</h2>
          <ul className="text-muted-foreground list-inside list-disc text-sm">
            {attention.map((profile) => (
              <li key={profile.id}>
                {profile.activeLinks === 0 && (
                  <span>/{profile.username} has no live links. </span>
                )}
                {!profile.hasAvatar && <span>/{profile.username} has no avatar. </span>}
                {!profile.hasBanner && <span>/{profile.username} has no banner. </span>}
                {!profile.hasBio && <span>/{profile.username} has no bio. </span>}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {totalClicks > 0 ? (
        <p className="text-muted-foreground text-sm">
          {totalClicks} link clicks in the last 30 days across all profiles.
        </p>
      ) : null}
    </div>
  );
}

"use client";

import type { Profile } from "@/lib/db/schema";
import { CheckCircleIcon, WarningCircleIcon } from "@phosphor-icons/react/ssr";

import { useProfileQuery } from "@/components/profile/use-profile-query";
import {
  discoverabilityStrength,
  type DiscoverabilityLevel,
  type DiscoverabilitySignalId,
} from "@/lib/profiles/discoverability";
import { cn } from "@/lib/utils";

const LEVEL_LABELS: Record<DiscoverabilityLevel, string> = {
  weak: "Weak",
  fair: "Fair",
  strong: "Strong",
};

const LEVEL_STYLES: Record<DiscoverabilityLevel, string> = {
  weak: "text-destructive",
  fair: "text-amber-600 dark:text-amber-500",
  strong: "text-green-600 dark:text-green-500",
};

const MET_STYLE = "text-green-600 dark:text-green-500";

/** Every fix lives in the SEO section, one card above the rating. */
const SIGNAL_LINK_LABELS: Record<DiscoverabilitySignalId, string> = {
  indexing: "Turn on indexing",
  title: "Add a page title",
  description: "Add a description",
  keywords: "Add keywords",
  "share-image": "Upload a share image",
};

/** The control inside the SEO section that resolves each signal. */
const SIGNAL_FOCUS_IDS: Record<DiscoverabilitySignalId, string> = {
  indexing: "search-indexing",
  title: "metaTitle",
  description: "metaDescription",
  keywords: "keywords",
  "share-image": "og-image-upload",
};

function SignalLink({ id }: { id: DiscoverabilitySignalId }) {
  return (
    <a
      href="#seo"
      onClick={(event) => {
        const target = document.getElementById(SIGNAL_FOCUS_IDS[id]);
        if (!target) {
          return; // nothing rendered to focus: fall back to the hash jump
        }
        event.preventDefault();
        // Centering keeps the field's label and description in view, and
        // focus() puts the caret straight into the input.
        target.scrollIntoView({ block: "center" });
        target.focus({ preventScroll: true });
      }}
      className="text-foreground underline underline-offset-2"
    >
      {SIGNAL_LINK_LABELS[id]}
    </a>
  );
}

/** The rating card: one gated level, one row per signal, one fix and link per miss. */
export function DiscoverabilitySection({
  username,
  profile,
}: {
  username: string;
  profile: Profile;
}) {
  // Client-side so saving the SEO section above moves this rating live.
  const { profile: live } = useProfileQuery(username, profile);
  const { level, gated, signals } = discoverabilityStrength(live);

  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-medium">Discoverability</h2>
        <span className={cn("text-sm font-medium", LEVEL_STYLES[level])}>
          {gated ? "Weak · indexing off" : LEVEL_LABELS[level]}
        </span>
      </div>
      <p className="text-muted-foreground mt-1 text-sm">
        How easily search engines and shared links can present this page. Strong means
        every signal below is met.
      </p>
      <ul className="mt-4 flex flex-col gap-2.5">
        {signals.map((signal) => (
          <li key={signal.id} className="flex items-start gap-2">
            {signal.met ? (
              <CheckCircleIcon
                weight="fill"
                className={cn("mt-0.5 size-4 shrink-0", MET_STYLE)}
              />
            ) : (
              <WarningCircleIcon className="text-muted-foreground mt-0.5 size-4 shrink-0" />
            )}
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="text-sm">{signal.label}</span>
              {signal.met ? null : (
                <p className="text-muted-foreground text-sm">
                  {signal.hint} <SignalLink id={signal.id} />
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

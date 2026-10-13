import { log } from "@/lib/log";
import { createClient } from "@/lib/supabase/server";

/**
 * Best-effort removal of storage objects a draft superseded. Failures are
 * logged, never surfaced: the publish already committed, and an orphaned
 * object is a storage concern, not a correctness one.
 */
export async function cleanupSupersededImages(
  entries: Array<{ bucket: string; path: string }>,
): Promise<void> {
  const supabase = await createClient();
  const byBucket = new Map<string, string[]>();
  for (const { bucket, path } of entries) {
    byBucket.set(bucket, [...(byBucket.get(bucket) ?? []), path]);
  }
  await Promise.all(
    [...byBucket].map(async ([bucket, paths]) => {
      const { error } = await supabase.storage.from(bucket).remove(paths);
      if (error) {
        log.error("profiles", `cleanupSupersededImages ${bucket} failed`, error.message);
      }
    }),
  );
}

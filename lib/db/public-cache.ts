import { updateTag } from "next/cache";
import { after } from "next/server";

/**
 * Tag shared by every cached public read. All mutations revalidate it.
 * Per-username tags would be finer, but profile + links writes are the only
 * sources and coarse invalidation is safer than missing one.
 */
export const PUBLIC_PROFILE_TAG = "public-profile";

/**
 * Expires the public page cache once the action's response has been sent.
 *
 * Called in the action body, updateTag does more than expire the tag: Next.js
 * re-renders the calling route into the action's own response, so every
 * editor commit re-suspends the (protected) loading boundary (the skeleton
 * flash) and tears down the editor's client state with it. The editor routes
 * never read this tag, so that re-render carries nothing they need. Deferred
 * past the response, the action result travels alone, the client router
 * stands down, and the public cache still expires immediately after: the
 * next public read blocks on fresh data, exactly like an in-band updateTag.
 */
export function expirePublicProfileCache() {
  after(() => updateTag(PUBLIC_PROFILE_TAG));
}

/**
 * Tag shared by every cached public read. All mutations revalidate it.
 * Per-username tags would be finer, but profile + links writes are the only
 * sources and coarse invalidation is safer than missing one.
 */
export const PUBLIC_PROFILE_TAG = "public-profile";

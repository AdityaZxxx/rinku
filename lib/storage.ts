export function avatarUrl(path: string): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${path}`;
}

export function bannerUrl(path: string): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/banners/${path}`;
}

export function linkImageUrl(path: string): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/link-images/${path}`;
}

/**
 * Same-origin blurred derivative for an age-gated link's thumbnail. The page
 * never receives the real `imageUrl` while a link is locked; this route
 * returns a downscaled, blurred copy instead, so removing any CSS cannot
 * recover the original.
 */
export function gatedThumbUrl(linkId: string): string {
  return `/api/gated-thumb/${linkId}`;
}

export function wallpaperUrl(path: string): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/wallpapers/${path}`;
}

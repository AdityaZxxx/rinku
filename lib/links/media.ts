export function isIconMedia(imageUrl: string | null | undefined): boolean {
  return imageUrl != null && imageUrl.startsWith("icon:");
}

export function iconMediaId(imageUrl: string): string {
  return imageUrl.slice("icon:".length);
}

export function hexWithAlpha(hex: string, alpha: string): string {
  return `${hex}${alpha}`;
}

export function mutedFor(bodyColor: string): string {
  return `color-mix(in oklch, ${bodyColor} 72%, transparent)`;
}

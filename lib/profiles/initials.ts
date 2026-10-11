/**
 * Avatar initials for a profile, by grapheme cluster, letters only.
 *
 * Code-unit slicing breaks twice over: `"🎨"[0]` is half a character, which
 * renders a replacement glyph in the browser and, through the server/client
 * split, both serializes and hydrates differently. The public header and the
 * editor must agree on the initials, so both call this one helper.
 *
 * Words without letters are skipped and a name with no letter at all falls
 * back to the username, whose handle regex guarantees ASCII letters, so the
 * avatar never renders an emoji or a broken glyph where users expect initials.
 */
export function profileInitials(displayName: string | null, username: string): string {
  return initial(displayName?.trim() ?? "") || initial(username);
}

function initial(source: string): string {
  const words = source.split(/\s+/).filter(hasLetter);
  const first = firstLetter(words[0] ?? "");
  const last = words.length > 1 ? firstLetter(words.at(-1) ?? "") : "";
  return (first + last).toUpperCase();
}

function hasLetter(word: string): boolean {
  return /\p{L}/u.test(word);
}

function firstLetter(word: string): string {
  for (const { segment } of new Intl.Segmenter(undefined, {
    granularity: "grapheme",
  }).segment(word)) {
    if (hasLetter(segment)) {
      return segment;
    }
  }
  return "";
}

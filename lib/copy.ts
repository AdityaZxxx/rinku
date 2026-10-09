/**
 * Clipboard write that works wherever the page can be opened: the async
 * clipboard API exists only in secure contexts (https or localhost), so
 * insecure origins copy through a textarea selection instead. Returns
 * whether the copy landed.
 */
export async function copyText(text: string): Promise<boolean> {
  // SAFETY: lib.dom types navigator.clipboard as always present, but
  // browsers omit the whole object on insecure origins; the widened shape is
  // what those contexts actually return.
  const clipboard = (
    navigator as { clipboard?: { writeText: (value: string) => Promise<void> } }
  ).clipboard;
  if (clipboard?.writeText) {
    try {
      await clipboard.writeText(text);
      return true;
    } catch {
      // A focused document can still be denied; try the selection copy.
    }
  }
  return copyWithSelection(text);
}

function copyWithSelection(text: string): boolean {
  const area = document.createElement("textarea");
  area.value = text;
  // Off-screen but rendered: detached nodes cannot be selected.
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.append(area);
  area.select();
  let copied = false;
  try {
    // eslint-disable-next-line unicorn/prefer-modern-dom-apis -- the async clipboard API does not exist on insecure origins; execCommand does
    copied = document.execCommand("copy");
  } catch {
    // execCommand can throw; false is the failure channel.
  }
  area.remove();
  return copied;
}

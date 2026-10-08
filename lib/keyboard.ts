/**
 * Shared guards for global keyboard shortcuts. Bare-key shortcuts (digits, "?")
 * must not steal keys from someone typing in a field or dismissing a dialog.
 */

export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  return target.isContentEditable || target.closest("input, textarea, select") !== null;
}

export function anyDialogOpen(): boolean {
  return document.querySelector('[role="dialog"], [role="alertdialog"]') !== null;
}

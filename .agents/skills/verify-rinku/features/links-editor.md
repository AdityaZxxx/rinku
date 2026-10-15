# Links editor

The links editor is where a profile's public sections are built: add links
of several kinds, edit them, reorder them by drag, hide or show them,
schedule a visibility window, age-gate a link, and archive it. The editor
page shows a live preview beside the list.

## Sub-features

- `add-custom` adds a standard URL link.
- `add-social` adds a social row from the catalog; social rows render as
  icons on the public page.
- `add-heading` adds a non-link section heading that groups rows under it.
- `edit-row` expands a row and changes its title or URL.
- `reorder` moves a row by dragging its handle; order is stored sparsely.
- `hide-show` toggles a row's active state without deleting it.
- `schedule` sets a `visibleFrom`/`visibleUntil` window on a link.
- `age-gate` sets a minimum age on a link; the public URL then redirects
  through a consent page.
- `archive` moves a row out of the list while keeping it, listed at
  `/<username>/links/archive` for restore.

## How to get to it (user POV)

- Press "3" in the dashboard, use the sidebar Links entry, or open
  `/<username>/links` directly for a profile you own.
- Add through the "Add" button at the top of the list: it opens the
  "Add a link" dialog with a searchable catalog by category.
- Reach the archive from the links page's archive entry.

## Driving it with the browser

Preconditions:

- Signed in, on your port, inside a `verify-%` profile created for this run.
- Doctor passed.

- **Add a custom link.** On `/<username>/links`, click "Add" (two Add
  buttons exist, desktop and mobile variants; use the one in the editor
  toolbar). In the "Add a link" dialog, fill
  `input[aria-label="Link URL or search"]` with the URL and wait a few
  seconds for the preview: the title derives from the page's Open Graph
  metadata. Click the "Add" button inside the dialog. The dialog closes and
  the new row appears in the list and in the preview pane beside it.
- **Add a heading.** Same dialog, heading category: title only, no URL.
  The row renders as text, not a button.
- **Edit.** Click a row (its selection control is labelled
  `Select <title>`) or "Expand link", change the title, confirm. The list
  and the preview show the new title.
- **Reorder.** The pointer drag surface is the whole row (dnd-kit listeners
  on the row, `cursor-grab`); the "Drag to reorder" grip is a keyboard
  helper that is `sr-only` until focused, so do not aim the drag at it: on
  rows with a thumbnail the artwork covers the grip's click point and the
  driver refuses. Drag row selector to row selector, for example
  `agent-browser drag '#link-<id-1>' '#link-<id-2>' --human`. The list
  order and the preview order both change, and positions stay sparse.
- **Hide.** Toggle the row's active control (headings use
  "Hide heading"/"Show heading"). The row leaves the public preview.
- **Schedule.** Open the row's schedule section and set a `visibleFrom` in
  the future. A single calendar click sets a one-day window
  (`visible_from` = that day's local midnight, `visible_until` = local
  23:59:59.999). The row leaves the public preview immediately.
- **Age gate.** Open the row's age gate section and set a minimum age
  between 13 and 99. Opening the section itself applies the 18 default at
  once (the header flips to "Visitors confirm they are 18+ ..."); the 13+,
  16+, 18+, and 21+ presets and the custom input write on click. The
  public page withholds the direct URL for the row.
- **Archive.** Archive the row from its menu; it leaves the list. Open
  `/<username>/links/archive`, find it, restore it. It returns to its
  position.
- **Proof.** After each mutation, second view with psql on the `verify-%`
  profile's rows: `select title, kind, is_active, position, visible_from,
min_age, archived_at from links where profile_id = (select id from
profiles where username = '<handle>') order by position`. Positions are
  sparse integers by design; order by them, do not expect 0..n.

## Gotchas

- Snapshot refs die between CLI invocations on this app; Base UI dialogs and
  menus may ignore synthetic clicks. Prefer `find` and CSS selectors, and
  use an in-page `eval` click when a control does not respond (see
  `../SKILL.md` Drive). The toolbar's "Add" sits next to "Archive" and
  "Select": click it by fresh ref, not by fuzzy name, or the click can
  land on Archive and navigate to the archive page.
- The public preview pane is part of the editor, not proof of public
  behavior: withholding is enforced by RLS, so public claims need the real
  `/<username>` page (see public-profile-page.md).
- Headings have no URL and cannot be clicked on the public page; adding a
  URL to a heading is invalid by schema, not just by UI.
- Music and video rows fetch external metadata (Apple Music search, YouTube
  or Vimeo); they are real network calls and can be slow or fail. Report
  the failure, do not retry until it "passes".
- The editor keeps a draft in manual save mode depending on the profile's
  editor settings; a fresh `verify-%` profile defaults to auto publish, so
  edits apply at once. Do not switch save modes on pre-existing profiles.
- Drag needs both rows visible: collapse nothing mid-drag, and drop onto a
  row, not into empty space.

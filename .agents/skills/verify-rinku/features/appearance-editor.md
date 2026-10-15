# Appearance editor

The appearance editor styles the public page: header layout, theme, fonts,
wallpaper, link button recipes, page alignment, avatar, and banner. Changes
apply to a live preview and persist to the profile row.

## Sub-features

- `theme-apply` applies one of the 16 preset palettes; the page re-renders
  in its colors.
- `custom-theme` marks the theme `custom` once anything is tweaked by hand.
- `font-apply` switches the typeface from the 16-font catalog.
- `wallpaper` switches the background among fill, gradient, blur, pattern,
  image, and video; patterns have dots, grid, lines, and waves variants with
  spacing and thickness.
- `button-recipe` changes contour (sharp, soft, round, pill), style (fill,
  outline, soft, glass), and umbra (none, soft, lift, hard), plus button
  colors.
- `header-style` switches the header among classic, hero, banner, cutout,
  minimal, and statement.
- `page-alignment` sets the content column center or left.
- `media-upload` uploads an avatar or banner to Supabase storage.

## How to get to it (user POV)

- Press "5" in the dashboard, use the sidebar Appearance entry, or open
  `/<username>/appearance` on the resolved port for a profile you own.

## Driving it with the browser

Preconditions:

- Signed in, on your port, inside a `verify-%` profile created for this run,
  with at least one section on it so the preview shows something.

- **Theme.** Pick a named theme (for example Sunset). The preview re-renders
  in the new palette at once.
- **Font.** Pick a font from the list. The preview's typeface changes.
- **Wallpaper.** Switch the kind to pattern, pick `waves`, and adjust
  spacing or thickness. The preview's background changes.
- **Button recipe.** Change contour to `round` and style to `outline`. The
  preview's buttons change shape and border.
- **Header style.** Switch to `banner`. The preview's header composition
  changes.
- **Avatar upload.** Use the media control to upload a local file (prepare
  a small PNG under 5 MiB in `.verifacts/`; `agent-browser upload
"<file input selector>" <path>` pushes it into the input). The preview
  shows the avatar.
- **Proof.** Second view with psql on the profile row:
  `select theme_id, font_id, wallpaper_kind, wallpaper_pattern,
button_contour, button_style, header_style, page_alignment, avatar_path
from profiles where username = '<handle>'` shows every change you drove.
  Then open the public page `/<username>` (see public-profile-page.md) and
  confirm the same look outside the editor.

## Gotchas

- Applying a theme never deletes uploaded media and never changes the
  header recipe; do not "fix" a preserved avatar by re-uploading.
- Any manual tweak moves the theme to `custom`; that is the design, not a
  bug to correct before the psql second view.
- Uploads go to the real Supabase storage bucket under the profile's paths
  (`avatarPath`, `bannerPath`). Cleanup does not remove storage objects for
  `verify-%` profiles today; keep uploaded files small and note them in the
  run report.
- The editor preview is a miniature render, not the public page: public
  claims always need the real `/<username>` check.
- Video wallpapers stream from external or storage URLs and can be slow;
  wait for the preview to settle before asserting.

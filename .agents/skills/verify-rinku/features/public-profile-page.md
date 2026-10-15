# Public profile page

The public page at `/<username>` is what visitors see: the profile's header,
bio, wallpaper, and its currently public sections in order. Visits are
recorded on render, section clicks go through `/go/<id>` for analytics, and
the database itself withholds anything that is not currently public.

## Sub-features

- `render` shows title, bio, handle, and the public sections in list order.
- `visit-recorded` records a page view for a genuine visitor.
- `click-through` redirects a section click through `/go/<id>` to the target
  URL and records the click.
- `age-gate` stops an age-gated link at a consent page until the visitor
  confirms.
- `withholding` hides inactive, archived, and out-of-schedule sections at
  the database level, not by client filtering.
- `not-found` shows the not-found state for an unknown username.
- `metadata` derives the HTML title as `<title> (@<username>)` unless an SEO
  override exists.

## How to get to it (user POV)

- Open `http://127.0.0.1:<port>/<username>` on the resolved port (examples
  use 3100), or click the public-page link from the editor.
- Click a section button on the page; the browser lands on the target URL
  after a stop at `/go/<id>`.
- Visit an unknown handle to see the not-found state.

## Driving it with the browser

Preconditions:

- A `verify-%` profile with at least one public link row (created per
  links-editor.md) and one age-gated link for the consent flow.
- The doctor passed on your port.

- **Render.** Open `http://127.0.0.1:3100/<handle>`. The page shows the
  profile title, the handle line when enabled, and the sections in the same
  order as the editor. The document title reads `<title> (@<handle>)`.
- **Click-through.** Read the link id from psql
  (`select id, url, click_count from links where profile_id = ...`), then
  `curl -sI http://127.0.0.1:3100/go/<id>` and expect a 3xx with `location`
  set to the link's URL. Then click the section in the browser and observe
  the navigation to the target. Second view: `click_count` increased by one
  and a new `link_clicks` row exists.
- **Age gate.** `curl -s http://127.0.0.1:3100/go/<gated id>` returns the
  consent HTML containing "Age-restricted link" and an "I am <N> or older"
  button. Click the gated section in the browser: the consent page appears
  first; confirming proceeds to the target.
- **Withholding.** Hide one section in the editor (or set `visibleFrom` in
  the future), then reload the public page: the section is gone while the
  editor still lists it. Restore the row through the editor afterwards.
- **Not found.** Open `/verify-nonexistent-<token>`; the not-found state
  renders and the document title is "Not found".
- **Visit recording.** The visit write path is the beacon fetch the page
  fires: POST `/<username>/visit` with JSON `{"profileId": "<id>"}` exactly
  as the page does. Drive it from a context that passes the route's rules
  (see Gotchas), then second view:
  `select count(*) from profile_visits where profile_id = ...` increased.
  Proven during generation: a signed-out curl POST with a normal Chrome UA
  returns 204 and inserts a row; the same POST with a `HeadlessChrome` UA
  returns 204 without a row, and a signed-in browser view of the page adds
  none.

## Gotchas

- Three visitor rules drop visits by design: bot-pattern user agents get
  204, the profile's owner does not count, and the beacon fires once per
  browser tab per profile (sessionStorage guard). Verification drives the
  owner's account, so signed-in browser visits do not record. To prove
  `visit-recorded`, POST the beacon fetch with a normal user agent while
  signed out (sign out via the sidebar "Account" menu first), or report the
  path as blocked when that is not possible.
- Public reads go through a cached wrapper tagged `public-profile`;
  mutations revalidate it. If the public page does not reflect an edit, wait
  for the revalidation, reload once, and only then investigate.
- First compile of the public route in dev is slow; wait for text rather
  than concluding the page is broken.
- The age-gate consent cookie is HMAC-signed with `AGE_GATE_SECRET`; a
  tampered cookie falls back to the consent page.
- Never assert public behavior from the editor preview: RLS withholds at
  the database, and only the real URL proves it.

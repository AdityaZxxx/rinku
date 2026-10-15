# Insights

The insights page reports the last 30 days of visits, clicks, and click rate
for one profile, with an activity chart, a date range picker, and highlights
for top links and sources.

## Sub-features

- `chart` renders the activity chart for the selected window.
- `range` changes the date range and the numbers follow.
- `highlights` lists top links and traffic sources for the window.
- `totals` matches the database counts for the same window.
- `empty-state` shows a coherent empty view for a profile with no traffic.

## How to get to it (user POV)

- Open `http://127.0.0.1:<port>/<username>/insights` on the resolved port,
  or press "6" in the dashboard or use the sidebar Insights entry.

## Driving it with the browser

Preconditions:

- A `verify-%` profile with seeded traffic: at least one click recorded via
  `/go/<id>` (clicks are deterministic; see public-profile-page.md), and,
  when possible, a recorded visit from a non-owner context.
- Signed in, on your port, doctor passed.

- **Open.** Open `http://127.0.0.1:3100/<handle>/insights`. The page shows
  the totals row, the activity chart, and the highlights.
- **Range.** Use the date range picker to narrow the window. The chart and
  totals re-render for the new window; the header shows it as
  "Oct 15 – Oct 15, 2026" style text.
- **Click parity.** Second view:
  `select count(*) from link_clicks where link_id in (select id from links
where profile_id = (select id from profiles where username = '<handle>'))`
  and the same for `profile_visits`. The page's click total for the default
  window matches the clicks you drove; the visit total matches only the
  visits that passed the beacon rules. Proven during generation: one driven
  click and one beacon visit rendered as 1 visit, 1 unique visitor, 1
  click, 1 unique clicker, 100% click rate, exactly matching psql.
- **Empty state.** Open insights for a fresh `verify-%` profile with no
  traffic. The page renders with zero totals and no crash; the console shows
  no errors.
- **Proof.** Save the populated insights screenshot with the window visible,
  the empty-state screenshot, and the psql counts next to them.

## Gotchas

- Visits are the fragile half: the owner does not count, bot-pattern user
  agents are dropped, and the beacon fires once per tab. Clicks are the
  deterministic signal; treat a visit mismatch as a beacon-rules outcome,
  not a bug, unless the route's rules changed.
- The default window is the last 30 days ending today; a click driven
  "yesterday" by a frozen clock or an old artifact will not appear.
- Times are grouped per the viewer's timezone with a UTC fallback; do not
  chase an off-by-one day at window edges before checking the timezone.
- The chart is a rendered component: assert on its visible labels and
  totals, not on internal SVG paths.

# Rinku verification map

This directory is the maintained source for verifying user-facing behavior of
Rinku. Read this index before driving the app, then use the matching feature
file as the recipe. Recipes name real labels, routes, and tables; do not
substitute guesses for them.

## Baseline preconditions

- Resolve and health-check the server per `../SKILL.md`: connect to the
  project's running dev server when `.next/dev/lock` points at a live PID,
  otherwise launch your own (default port 3100). Pass
  `bash ../scripts/doctor.sh <port>` with that port. Never kill a server you
  did not launch.
- Sign in with `VERIFY_RINKU_EMAIL` and `VERIFY_RINKU_PASSWORD` from
  `.env.local`. This is the owner's real account: every pre-existing profile
  and link in it belongs to the user.
- Create a fresh profile per run with a run-unique handle:
  `verify-<date +%m%d%H%M>` plus a suffix on collision. Never reuse a handle
  from a previous run: released handles can sit in a claim cooldown.
- Touch only rows under `verify-%` profiles. Never edit, hide, archive, or
  delete a pre-existing profile or link, even to "restore" it.
- Never drive an instance you did not start, and never kill a process by
  name: the user's own dev server runs `next` too.

## Driving conventions

- Start every recipe from the baseline state unless its preconditions say
  otherwise.
- Drive through the `agent-browser` CLI; its profile is persistent, so check
  who is signed in (sidebar "Account" button shows the email) before
  signing in. Refs from a snapshot go stale between CLI calls: prefer
  `find role ... click "<label>"` and CSS selectors, and fall back to an
  in-page `eval` click when a Base UI dialog or menu ignores synthetic
  clicks.
- Prefer accessible names and visible labels: this codebase labels controls
  deliberately. Treat quoted labels in the recipes as literal.
- Wait for state, not a fixed sleep. First compile of a route in dev is
  slow: `open` may time out while the page still loads, so confirm with
  `get url` and `get title`.
- Server actions cannot be driven with curl. curl is for GET surfaces and
  the visit beacon POST only.
- psql is a read-only second view. The pooler role bypasses RLS: read with
  it, never write with it.
- Restore nothing by hand: cleanup (`bash ../scripts/cleanup.sh --yes`)
  removes every `verify-%` profile and cascades its rows, and
  `agent-browser close` drops the run's session.

## Proof and skip reporting

- Artifacts go to `.verifacts/<feature>/` at the repo root: screenshots,
  snapshot excerpts, curl outputs, psql counts.
- Capture the action and the resulting state, not only the final screen.
- Mutation proof includes a read-only second view of the stored row.
- Public-page proof must come from the public URL, not from the editor
  preview: withholding is enforced by RLS at the database.
- Report an unreachable path with the attempted step and the unmet
  precondition. Never report a skipped entry point as verified through a
  different path.

## Feature entry contract

Each feature file starts with an H1 title and one paragraph describing the
user-visible behavior. It then uses exactly four H2 sections in this order.

1. `Sub-features` lists short IDs with one line for each behavior.
2. `How to get to it (user POV)` lists every user entry point.
3. `Driving it with the browser` starts with `Preconditions:` and uses
   labeled bullets that pair each user action with an observable result.
4. `Gotchas` lists traps that can waste or invalidate a verification run.

Keep implementation details out of the map. Name only user paths, stable
handles, required state, and observable proof.

## Features

- [Sign in and dashboard](./sign-in-and-dashboard.md) covers sign-in,
  protected-route redirect, sidebar and digit navigation, profile switching,
  and creating a profile through onboarding.
- [Links editor](./links-editor.md) covers adding, editing, reordering,
  hiding, scheduling, age-gating, and archiving sections.
- [Appearance editor](./appearance-editor.md) covers themes, fonts,
  wallpapers, button recipes, header styles, and avatar and banner uploads.
- [Public profile page](./public-profile-page.md) covers rendering, visit
  recording, click-through analytics, the age-gate consent flow, and RLS
  withholding of non-public sections.
- [Insights](./insights.md) covers the 30-day visits and clicks dashboard
  against second-view counts.

Not yet mapped (add a file before driving them in earnest): overview page,
per-profile SEO settings, account settings, QR API details, gated thumbnails,
the command palette beyond opening it.

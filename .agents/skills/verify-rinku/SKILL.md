---
name: verify-rinku
description: "Drive the real Rinku app on a dedicated dev instance and prove user-facing behavior: launch, sign in, exercise the dashboard and the public page, capture evidence, clean up. Load this whenever a Rinku claim needs proof, a change needs a smoke test, or behavior must be checked end to end."
---

# Verify Rinku

Rinku is a link-in-bio SaaS: one public page per profile at `/<username>`, a
signed-in dashboard, Next.js 16 on Bun, data in a hosted Supabase Postgres
through Drizzle. This skill runs the app for real and proves what a user
would see and get. It is written for the next agent: read cold, mid-task.

Two facts shape every rule here:

- **The database is shared and live.** There is no disposable copy. The dev
  Supabase project holds the owner's real data (at generation time: 1
  account, 2 profiles, 5 links). Your unit of isolation is the `verify-`
  username prefix: create and touch only rows under profiles whose username
  starts with `verify-`, never a pre-existing row.
- **`next dev` is a singleton per project in Next 16.** It writes its PID
  and port to `.next/dev/lock` and refuses to start twice ("Another next
  dev server is already running"). If the project's server is running, you
  connect to it and never kill it; you only launch your own when none is
  running.

## Launch

From the repo root:

1. `bun install` when `node_modules/` is missing (bun is pinned by
   `packageManager` in package.json).
2. Check `.env.local` exists and contains all of: `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `DATABASE_URL`, `AGE_GATE_SECRET`,
   `VERIFY_RINKU_EMAIL`, `VERIFY_RINKU_PASSWORD`. If any is missing, stop and
   report; never invent values.
3. Apply migrations once per checkout. drizzle-kit does not read
   `.env.local` itself, so source it first:
   `set -a; . ./.env.local; set +a; bun run db:migrate` (idempotent).
4. Resolve the server to drive:
   - If `.next/dev/lock` exists, read it (JSON with `pid`, `port`,
     `appUrl`). When that PID is alive, it is this project's running dev
     server: drive its port and never kill it.
   - When there is no lock or the PID is dead, launch your own in the
     background and record the PID:
     `nohup ./node_modules/.bin/next dev -p 3100 > /tmp/rinku-verify-dev.log 2>&1 & echo $!`
5. Ready means all of: `curl -sf http://127.0.0.1:<port>/login` returns 200
   and its HTML contains "Rinku", and `scripts/doctor.sh <port>` passes. The
   first compile of a route is slow; poll with a bounded loop instead of a
   fixed sleep. A port that accepts TCP is not ready.
6. Teardown: if you launched the server, kill your recorded PID only, never
   by process name (the lock PID may be the user's own server). If you
   connected to a running server, leave it running. Confirm the port is free
   afterwards when you launched it.

Isolation rules, restated because they are load-bearing: the server may be
the user's own (never kill it, never restart it); the database is shared
(only write rows under `verify-%`); the verify credentials live in
`.env.local` and never appear in artifacts, logs, or command output.

## Doctor

`bash scripts/doctor.sh 3100` runs read-only checks: required env vars
present (it prints names, never values), the instance on the port serves the
brand marker, the database answers with table counts, the shared verify
account exists, and the current `verify-%` profiles are listed. Run it right
after launch and again whenever anything looks off: it tells you whether the
problem is the instance, the database, or the data.

## Drive

Drive through the `agent-browser` CLI (installed at `~/.bun/bin/agent-browser`)
against the resolved port. It launches its own browser with a persistent
profile, so a previous run's session may still be signed in: open `/login`
first; if it lands on `/dashboard`, check the sidebar "Account" button, which
shows the signed-in email, and sign out first unless it is the verify
account.

- `agent-browser open <url>` navigates; it can time out on a route's first
  compile while the page still loads. Confirm with `get url` and `get title`
  instead of retrying blind.
- `agent-browser snapshot` prints the accessibility tree with `@refs`. On
  this app refs go stale between CLI invocations (focus-triggered refetches
  re-render the tree), so prefer `find role <role> click "<label>"` and CSS
  selectors, and re-snapshot right before a ref click.
- `agent-browser find role <role> click "<label>"` locates controls by
  accessible name. This codebase labels its controls well: "Sign in",
  "Add", "Create new profile", "Drag to reorder".
- Base UI dialogs and menus are unreliable under synthetic clicks: when a
  click reports done but nothing opens, fall back to an in-page click, for
  example `agent-browser eval "[...document.querySelectorAll('[role=\"dialog\"] button')].find(b => b.textContent.trim() === 'Add')?.click()"`.
  Dropdown menus may not open at all headlessly; navigate to the target URL
  directly instead, every section and page has one.
- Stable ids and labels exist where drift hurts: login fields are `#email`
  and `#password`; the add-link URL field is
  `input[aria-label="Link URL or search"]`.
- `agent-browser screenshot <absolute-path>` writes evidence; relative
  paths land in the daemon's tmp dir instead. `console`, `errors`, and
  `network requests` read browser-side evidence.
- Digit keys 1 through 7 switch dashboard sections (dashboard, overview,
  links, profile, appearance, insights, settings; source:
  `lib/dashboard/shortcuts.ts`). "?" opens the command palette.

Sign in with `VERIFY_RINKU_EMAIL` and `VERIFY_RINKU_PASSWORD` read from
`.env.local` in the shell, never echoed: fill `#email` and `#password` on
`/login`, then click "Sign in". The navigation runs in a transition, so poll
`get url` for `/dashboard` instead of checking once.

`curl` handles the GET surfaces: `curl -I http://127.0.0.1:<port>/go/<id>`
expects a 3xx redirect, the age-gate consent page is plain HTML with stable
strings, `/api/qr` serves an image. Server actions are POST-only with
encrypted action ids: never drive mutations with curl, use the browser.

`psql "$DATABASE_URL"` is a second view for evidence only. The pooler role
bypasses RLS, which is exactly why it must stay read-only: read with it,
never write with it. The app's own writes are what you are proving.

## Evidence

Write artifacts to `.verifacts/<feature>/` at the repo root (gitignored):
screenshots (`agent-browser screenshot <path>`), accessibility snapshot
excerpts, curl outputs, psql counts. Standards:

- Drive the real user path: forms, buttons, keyboard. Never INSERT rows for
  the app to "find" later.
- Capture the action and the resulting state, not only the final screen.
- Verify side effects in the database alongside what is visible: a created
  link is a `links` row with the expected fields, a click-through is a
  `link_clicks` row plus a bumped `links.click_count`.
- Rinku's external boundaries (Apple Music search, Open Graph thumbnails,
  Supabase storage) are real network calls. If a proof needs a mock, stop
  and report instead of faking it.

## Cleanup

`bash scripts/cleanup.sh` lists what would go, `bash scripts/cleanup.sh
--yes` deletes it: only profiles of the shared account whose username starts
with `verify-`. Foreign keys cascade their links, clicks, visits, and
username history. The account row and every other profile survive. Run
cleanup after every run, failed runs included, and kill your recorded
dev-server PID only if you launched it. `agent-browser close` drops the
run's browser session and its cookies. Evidence in `.verifacts/` survives
cleanup.

## Diagnostics

When pages misbehave, read the framework's own views before guessing:

- The dev server log lives at `.next/dev/logs/next-development.log`; browser
  console errors are forwarded into it by `next dev`.
- The `next-devtools` MCP server (configured in `opencode.json`) talks to the
  running dev server: `get_errors` returns config, runtime, and build errors;
  `get_compilation_issues` builds the full module graph; `get_routes` lists
  routes; `compile_route` warms one route without an HTTP request.
- A 500 on every page right after a dependency change usually means the
  running server predates the change: `node_modules` moved under it. Restart
  the server you launched, or ask the user when it is theirs.

## Helpers

- `bash scripts/doctor.sh <port>`: read-only health and isolation checks.
- `bash scripts/cleanup.sh [--yes]`: delete only verification-created
  profiles, list-first by default.

Both scripts live beside this file; run them from anywhere, they locate the
repo root themselves.

## Features

Read `features/README.md` first, then the matching feature file as the
recipe. When the app changes, update the matching feature file in the same
change.

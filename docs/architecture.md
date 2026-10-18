# Architecture

One-page map of where things live. Move or rename a domain folder and this
file changes in the same commit. What a folder contains is one `ls` away;
this file carries what the tree cannot say.

## Data flow

Browser → server action (`app/actions/<domain>/<segment>`) → domain module
(`lib/<domain>`) → database helper (`lib/db`) → Postgres through Drizzle.
Server actions run with the caller's claims via `withUserDb`; public pages
read with `withAnonDb`. Importing `@/lib/db/client` directly is lint-blocked
because a raw connection bypasses RLS.

## Layers

- `lib/db/schema/` - Drizzle tables; the per-aggregate query modules, the
  `with-user.ts` RLS context, and `public-cache.ts` sit beside it in
  `lib/db/`.
- `lib/<domain>/` - Pure domain logic per feature: `lib/profiles`,
  `lib/links`, `lib/dashboard`, `lib/supabase`, plus `lib/auth.ts` for
  sessions. `lib/profiles/appearance.ts` owns the appearance schema and
  resolution; the `appearance-*` siblings are the option catalogs it
  composes.
- `app/actions/` - Server actions, one folder per domain, one file per
  mutated segment; single-segment domains are flat files.
- `components/<domain>/` - Feature components mirroring the routes they
  serve. The appearance editor is a composition: each section component
  owns its fields, the upload dialog owns media intake, the mocks module
  renders the miniature previews.
- Vendored, never hand-edited: `components/ui/` (shadcn), `drizzle/meta/`
  (drizzle-kit), `tools/oxlint/anti-slop/` (lint plugin).

## Routes

- `app/(protected)/` - the signed-in dashboard: `dashboard/` (profile hub),
  `account/settings/`, and the per-profile editor under `[username]/`
  (overview, appearance, profile, links, insights, settings).
- `app/[username]/` - the public page; `visit/` records the visit first.
- `app/go/[id]/` - click-through redirect with age gate and analytics.
- `app/login/`, `app/signup/`, `app/auth/callback/` - auth flows;
  `app/onboarding/` - first-run setup.
- `app/api/` - route handlers (QR codes, gated thumbnails).

## Guardrails

- `bun run check`: lint, format, typecheck, db:check, version check, tests.
- Mutation actions expire the public profile cache through
  `expirePublicProfileCache()` (`lib/db/public-cache.ts`), never an inline
  `updateTag`: an in-band revalidation makes the caller's route re-render into
  the action response, remounting the editor mid-edit. The helper defers the
  tag expiration past the response via `after()` with no staleness.
- `.oxlintrc.json` caps non-vendor files at 500 lines, no exceptions.

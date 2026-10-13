# Architecture

One-page map of where things live. Move or rename a domain folder and this
file changes in the same commit.

## Data flow

Browser → server action (`app/actions/<domain>`) → domain module
(`lib/<domain>`) → database helper (`lib/db`) → Postgres through Drizzle.
Server actions run with the caller's claims via `withUserDb`; public pages
read with `withAnonDb`. Importing `@/lib/db/client` directly is lint-blocked
because a raw connection bypasses RLS.

## Layers

- `lib/db/schema/` - Drizzle tables: `profiles`, `links`, `editor`.
- `lib/db/` - Per-aggregate query modules (`profile.ts`, `links.ts`,
  `account.ts`, `overview.ts`, `editor.ts`), the RLS context in
  `with-user.ts`, and `public-cache.ts` for public page caching.
- `lib/<domain>/` - Pure domain logic: `lib/profiles` (`appearance.ts` owns
  the appearance schema and resolution; the `appearance-buttons/fonts/options/colors`
  siblings own the option catalogs it composes; plus `schema`,
  `appearance-presets`, `editor-draft`, `sections`, `storage-cleanup`),
  `lib/links` (model, platforms, embeds, media, music, age gate),
  `lib/dashboard` (shortcuts, keyboard), `lib/supabase` (client, server,
  storage), `lib/auth.ts` (session helpers).
- `app/actions/` - Server actions, one file per segment they mutate, all
  inside the domain folder: `profiles/profile.ts` (profile row) with
  `profiles/username.ts`, `profiles/seo.ts`, `profiles/drafts.ts`,
  `profiles/appearance.ts`, `profiles/editor-settings.ts`, and
  `profiles/media/avatar.ts` + `profiles/media/appearance.ts`;
  `links/link.ts` (reads, create, update) with `links/media.ts`,
  `links/archive.ts`, `links/order.ts`; plus the single-segment
  `accounts.ts`, `apple-music.ts`, `auth.ts`.
- `components/<domain>/` - Feature components mirroring the routes they
  serve: `appearance`, `links`, `profile`, `insights`, `overview`,
  `settings`, `dashboard`, `auth`, plus `landing` and `legal` for the
  public marketing pages.
- Vendored, never hand-edited: `components/ui/` (shadcn), `drizzle/meta/`
  (drizzle-kit), `tools/oxlint/anti-slop/` (lint plugin).

## Routes

- `app/(protected)/dashboard/` - the signed-in hub listing profiles.
- `app/(protected)/account/settings/` - user-level account settings.
- `app/(protected)/[username]/` - the per-profile editor: `overview`,
  `appearance`, `profile`, `links`, `insights`, `settings`.
- `app/[username]/` - the public link-in-bio page; `visit/` records the
  visit before rendering.
- `app/go/[id]/` - click-through redirect with age gate and analytics.
- `app/login/`, `app/signup/`, `app/auth/callback/` - auth flows;
  `app/onboarding/` - first-run setup.
- `app/api/qr/`, `app/api/gated-thumb/` - route handlers.

## Guardrails

- `bun run check`: lint, format, typecheck, db:check, version check.
- `.oxlintrc.json` caps non-vendor files at 500 lines, with no exceptions:
  an oversized file fails lint instead of earning an exemption.

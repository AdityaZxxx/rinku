# Rinku

Link-in-bio SaaS. One public page per user at `rinku.app/<username>`, built with
Next.js 16, Supabase (auth + storage), and Drizzle (data).

## Commands

```bash
bun dev              # dev server
bun build            # production build
bun run check        # lint + format:check + typecheck + drizzle-kit check

bun run db:generate  # generate a migration from lib/db/schema
bun run db:migrate   # apply pending migrations
bun run db:studio    # browse data
```

## Three lint rules are off on purpose

`react-perf/jsx-no-new-function-as-prop`, `react-perf/jsx-no-jsx-as-prop`, and
`react/no-children-prop` are disabled in `.oxlintrc.json`.

- The first exists to stop closure churn, which the React Compiler now handles
  (it is enabled in `next.config.ts`). Keeping it would flag every inline
  `onChange` and `onSubmit`.
- The second fires on Base UI's `render` prop, which is how that library composes
  a link or button.
- The third fires on TanStack Form's `form.Field children={...}`, which is its
  documented render-prop API and has no alternative.

## Three directories are excluded from lint, format, or typecheck

`components/ui/`, `drizzle/meta/`, and `tools/oxlint/anti-slop/` are written by
other tools, and each emits its own house style:

- `components/ui/` comes from `shadcn add` and uses no semicolons; this project
  uses semicolons.
- `drizzle/meta/` comes from `drizzle-kit generate`.
- `tools/oxlint/anti-slop/` is vendored from
  [dmmulroy/anti-slop](https://github.com/dmmulroy/anti-slop), which uses tabs
  and imports with explicit `.ts` extensions.

Running a formatter over any of them guarantees that `bun run check` fails the
moment they are regenerated, and hand-editing them is pointless because the next
tool run overwrites the file. All three are ignored in `.oxlintrc.json` and
`.oxfmtrc.json` for that reason, not as a style preference, and
`lint-staged.config.mjs` filters them so a commit touching only vendored files
still passes.

`components/ui/` and `drizzle/meta/` are still type-checked, which is where a
genuine breakage in a vendored component would surface. The anti-slop plugin is
additionally excluded from `tsc`: it is written against a laxer compiler config
and imports with explicit `.ts` extensions, so it cannot typecheck under this
project's stricter `noUncheckedIndexedAccess`. oxlint loads it through its own
transpiler, so type errors there never affect runtime.

## anti-slop

Vendored opinionated oxlint rules, not an npm dependency. `@oxlint/plugins` is
pinned to the exact same version as `oxlint` (currently `1.86.0`) because the two
must move together; a floating `^1.86.0` on `oxlint` would drift ahead of the
plugin on the next release.

`anti-slop/require-readable-spacing` is deliberately **not** enabled. Its autofix
inserts blank lines, which competes with `oxfmt` over whitespace. Every other
generic rule from the plugin is on. The Effect rules are also off, since this
project does not use Effect.

## Querying data

`auth.uid()` in Supabase reads `request.jwt.claims`, a session setting that
PostgREST normally populates from the bearer token. A direct Postgres connection
never has it, so policies silently evaluate false. Use `withUserDb(userId, fn)`
from `lib/db/with-user.ts` for any query that depends on the current user; it
sets the claims and `set local role authenticated` inside a transaction. A missing
`WHERE user_id` will then return nothing rather than another user's rows.

## Server actions

Server actions live in `app/actions/<domain>.ts` — currently `auth.ts` — each
file starting with `"use server"`, following the Next.js docs convention of
grouping actions by the segment they mutate.

## Not set up yet

`.env.local` is required (`NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `DATABASE_URL`) and points at the remote
project, where migrations have been applied. Not yet configured there: the
Google OAuth provider (the Google button fails without it) and the production
redirect URLs; localhost is covered by the defaults.

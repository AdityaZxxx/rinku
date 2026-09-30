# Rinku

Link-in-bio SaaS. One public page per user at `rinku.app/<username>`, built with
Next.js 16, Supabase (auth + storage), and Drizzle (data).

## Commands

```bash
bun dev              # dev server
bun build            # production build
bun run check        # lint + format:check + typecheck + drizzle-kit check

bun run db:generate  # generate a migration from lib/db/schema.ts
bun run db:migrate   # apply pending migrations
bun run db:studio    # browse data
```

## Two directories are excluded from lint and format

`components/ui/` and `drizzle/meta/` are written by other tools, and both emit
their own house style:

- `components/ui/` comes from `shadcn add` and uses no semicolons; this project
  uses semicolons.
- `drizzle/meta/` comes from `drizzle-kit generate`.

Running a formatter over either one guarantees that `bun run check` fails the
moment they are regenerated, and hand-editing them is pointless because the next
tool run overwrites the file. Both are ignored in `.oxlintrc.json` and
`.oxfmtrc.json` for that reason, not as a style preference.

They are still type-checked, which is where a genuine breakage in a vendored
component would surface.

## Querying data

`auth.uid()` in Supabase reads `request.jwt.claims`, a session setting that
PostgREST normally populates from the bearer token. A direct Postgres connection
never has it, so policies silently evaluate false. Use `withUserDb(userId, fn)`
from `lib/db/with-user.ts` for any query that depends on the current user; it
sets the claims and `set local role authenticated` inside a transaction. A missing
`WHERE user_id` will then return nothing rather than another user's rows.

## Not set up yet

`.env.local` is required (`NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `DATABASE_URL`). Migrations have not been
run, so no tables exist.

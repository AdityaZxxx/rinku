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

## Not set up yet

`.env.local` is required (`NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `DATABASE_URL`) and points at the remote
project, where migrations have been applied. Not yet configured there: the
Google OAuth provider (the Google button fails without it) and the production
redirect URLs; localhost is covered by the defaults.

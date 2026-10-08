# Rinku

Link-in-bio SaaS. Public page per user at `/[username]`, built with
Next.js 16, Supabase (auth + storage), and Drizzle (data).

## Features

- **Multi-profile**: run several pages from one dashboard and switch between
  them from the sidebar.
- **Link types**: socials, headings, music (Apple Music search), video
  (YouTube, Vimeo), and embeds (maps, calendars, forms).
- **Link controls**: schedule visibility with a date range, hide, archive, or
  age-gate individual links.
- **Thumbnails**: pulled from the target page's Open Graph metadata.
- **Appearance**: themes, fonts, wallpapers, avatar, and banner.
- **Per-profile SEO**: custom title, description, keywords, and og image.
- **Save modes**: auto publishes as you edit; manual keeps a draft with undo
  and redo until you publish.
- **Insights**: visits, clicks, and click rate for the last 30 days.
- **Command palette**: digit-key section navigation and a "?" cheatsheet.

## Setup

1. `bun install`
2. Create `.env.local` with the variables below.
3. `bun run db:migrate` to apply the migrations in `drizzle/` to your database.
4. `bun dev`

### Environment variables

| Variable                               | Purpose                                                                                                                                                                                                             |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | Supabase project URL.                                                                                                                                                                                               |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key. Safe in the browser because row-level security is the security model; never replace it with a `service_role` key.                                                                                  |
| `DATABASE_URL`                         | Postgres connection for data. Use the Session pooler on port 5432; the Transaction pooler breaks the prepared statements the driver needs.                                                                          |
| `DIRECT_URL`                           | Optional. Separate connection for migrations; falls back to `DATABASE_URL`.                                                                                                                                         |
| `NEXT_PUBLIC_SITE_URL`                 | Canonical origin for share URLs and Open Graph metadata, no trailing slash. Unset, the client falls back to the request origin and server metadata to localhost; set it in production. Read through `lib/brand.ts`. |
| `AGE_GATE_SECRET`                      | HMAC key for age-gate consent cookies. A random value, e.g. `openssl rand -base64 32`.                                                                                                                              |

### Production checklist

- Set `NEXT_PUBLIC_SITE_URL`, or canonical and Open Graph URLs point at
  localhost.
- Add the production redirect URLs to Supabase auth; localhost is covered by
  the defaults.
- Configure the Google OAuth provider in Supabase; the Google sign-in button
  fails without it.

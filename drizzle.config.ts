import { defineConfig } from "drizzle-kit";

/**
 * `DATABASE_URL` is the direct Postgres connection, not the PostgREST URL.
 *
 * Use the **Session pooler** connection string for migrations and for anything
 * long-lived. The Transaction pooler (port 6543) does not support prepared
 * statements, which the `postgres` driver needs, and Supabase's own Drizzle
 * guide calls out the same caveat.
 */
export default defineConfig({
  schema: "./lib/db/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",

  dbCredentials: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "",
  },

  strict: true,
  verbose: true,
});

import type { schema } from "./schema";
import type { PgQueryResultHKT } from "drizzle-orm/pg-core";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";

import { db } from "./client";
import "server-only";

export type Database = PostgresJsDatabase<typeof schema>;

/**
 * Runs `fn` as `userId` with Row Level Security actually enforced.
 *
 * This indirection exists because Supabase's `auth.uid()` is not magic: it
 * reads `request.jwt.claims`, a session setting that PostgREST normally populates
 * from the incoming bearer token. A direct Postgres connection never has that
 * setting, so `auth.uid()` returns null and every policy comparing against it
 * evaluates false — silently. Without this wrapper, a missing `WHERE user_id`
 * would look like it "worked" (returning zero rows) while the RLS story was
 * never actually being tested.
 *
 * Both statements are transaction-local, so claims from one user can never leak
 * to the next request on a pooled connection.
 *
 * The user id is taken from a verified `getClaims()` call, never from a
 * parameter a request body could set.
 */
export async function withUserDb<T>(
  userId: string,
  fn: (tx: Database) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    const claims = JSON.stringify({
      sub: userId,
      role: "authenticated",
      aud: "authenticated",
      iss: process.env.NEXT_PUBLIC_SUPABASE_URL,
    });

    // `true` scopes the setting to this transaction rather than the session.
    await tx.execute(sql`select set_config('request.jwt.claims', ${claims}, true)`);
    // Policies are written against this role; without it the connection's
    // default role (usually `postgres`) bypasses RLS entirely.
    await tx.execute(sql`set local role authenticated`);

    return fn(tx as unknown as Database);
  });
}

/** Read-only counterpart of {@link withUserDb}, for public pages. */
export async function withAnonDb<T>(fn: (tx: Database) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`select set_config('request.jwt.claims', '{"role":"anon"}', true)`,
    );
    await tx.execute(sql`set local role anon`);
    return fn(tx as unknown as Database);
  });
}

export type { PgQueryResultHKT };

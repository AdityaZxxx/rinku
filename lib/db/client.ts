import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { schema } from "./schema";

/**
 * Direct Postgres connection for Drizzle.
 *
 * Kept in one module so a single pool is reused across hot reloads in
 * development. In production this module is evaluated once per server instance,
 * which is the correct lifetime for a connection pool.
 */
function connect() {
  const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env.local and point it at " +
        "your Supabase Postgres connection string.",
    );
  }

  const client = postgres(url, {
    // Keeps Next.js from holding a connection open on every error path.
    max: process.env.NODE_ENV === "production" ? 10 : 1,
    // Serverless deployments recycle the process on every invocation, and a
    // lingering idle connection would be dropped mid-query by the platform.
    idle_timeout: 20,
    connect_timeout: 10,
  });

  return drizzle(client, { schema });
}

/**
 * Next.js dev reloads modules on every edit. Without a process-wide cache each
 * reload would open another pool until Postgres refuses connections. Declared
 * as a global rather than reached for with an `as unknown as` cast.
 */
declare global {
  // eslint-disable-next-line no-var
  var rinkuDb: ReturnType<typeof connect> | undefined;
}

export const db = globalThis.rinkuDb ?? connect();

if (process.env.NODE_ENV !== "production") {
  globalThis.rinkuDb = db;
}

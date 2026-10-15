#!/usr/bin/env bash
# Read-only health checks for the verify-rinku instance: env vars present by
# name, the instance serving the brand marker, the database reachable, and
# the isolation surface (verify-% profiles) listed. Never prints values.
set -u

ROOT="$(cd "$(dirname "$0")/../../../.." && pwd)"
PORT="${1:-3100}"
status=0

fail() { echo "FAIL: $1"; status=1; }
ok() { echo "ok: $1"; }

if [ -f "$ROOT/.env.local" ]; then
  ok ".env.local exists"
else
  fail ".env.local missing at $ROOT/.env.local"
  exit 1
fi

set -a
# shellcheck disable=SC1091
. "$ROOT/.env.local"
set +a

for var in NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY \
  DATABASE_URL AGE_GATE_SECRET VERIFY_RINKU_EMAIL VERIFY_RINKU_PASSWORD; do
  if [ -n "${!var:-}" ]; then
    ok "$var set"
  else
    fail "$var empty or missing"
  fi
done

if curl -sf "http://127.0.0.1:$PORT/login" | grep -q "Rinku"; then
  ok "instance on $PORT serves the brand marker"
else
  fail "instance on $PORT did not answer with the Rinku login page (not ready, wrong port, or not ours)"
fi

DB_OUTPUT="$(psql "$DATABASE_URL" -tA -v verify_email="$VERIFY_RINKU_EMAIL" <<'SQL' 2>&1
select 'profiles:' || count(*) from public.profiles;
select 'links:' || count(*) from public.links;
select 'verify_account:' || count(*) from auth.users where lower(email) = lower(:'verify_email');
select 'verify_profiles:' || coalesce(string_agg(username, ', '), 'none') from public.profiles where username like 'verify-%';
SQL
)" || true

if echo "$DB_OUTPUT" | grep -q "profiles:"; then
  echo "$DB_OUTPUT" | sed 's/^/db: /'
  if ! echo "$DB_OUTPUT" | grep -q "verify_account:1"; then
    fail "verify account not found in auth.users (check VERIFY_RINKU_EMAIL)"
  fi
else
  fail "database unreachable: $DB_OUTPUT"
fi

exit "$status"

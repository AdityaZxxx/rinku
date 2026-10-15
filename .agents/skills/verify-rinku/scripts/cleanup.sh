#!/usr/bin/env bash
# Deletes only verification-created rows: profiles of the shared verify
# account whose username starts with "verify-". Foreign keys cascade their
# links, clicks, visits, and username history. The account row and every
# other profile survive. Run without arguments for a dry run, with --yes to
# delete.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../../.." && pwd)"
[ -f "$ROOT/.env.local" ] || { echo "missing $ROOT/.env.local"; exit 1; }

set -a
# shellcheck disable=SC1091
. "$ROOT/.env.local"
set +a
: "${VERIFY_RINKU_EMAIL:?set VERIFY_RINKU_EMAIL in .env.local}"
: "${DATABASE_URL:?set DATABASE_URL in .env.local}"

echo "verify-% profiles owned by the verify account:"
psql "$DATABASE_URL" -tA -v verify_email="$VERIFY_RINKU_EMAIL" <<'SQL'
select p.username,
    (select count(*) from public.links l where l.profile_id = p.id) as links,
    (select count(*) from public.profile_visits v where v.profile_id = p.id) as visits
  from public.profiles p
  where p.user_id = (select id from auth.users where lower(email) = lower(:'verify_email'))
    and p.username like 'verify-%'
  order by p.username;
SQL

if [ "${1:-}" != "--yes" ]; then
  echo "dry run: rerun with --yes to delete these profiles"
  exit 0
fi

# Deleting the profile row cascades everything the run created; released
# handles may sit in a claim cooldown, so always use fresh handles next run.
DELETED="$(psql "$DATABASE_URL" -tA -v verify_email="$VERIFY_RINKU_EMAIL" <<'SQL'
with deleted as (
  delete from public.profiles
  where user_id = (select id from auth.users where lower(email) = lower(:'verify_email'))
    and username like 'verify-%'
  returning username
) select coalesce(string_agg(username, ', '), 'none') from deleted;
SQL
)"

echo "deleted profiles: $DELETED"

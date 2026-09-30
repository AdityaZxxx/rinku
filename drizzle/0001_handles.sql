-- Everything the Drizzle schema cannot express: the handle lifecycle triggers and
-- the availability check.
--
-- The rule for who may hold a handle lives in exactly one function,
-- `is_username_available`. The trigger and the signup path both call it, so the
-- policy cannot drift between call sites.

-- ---------------------------------------------------------------------------
-- RLS on a policy-less table
-- ---------------------------------------------------------------------------

-- Drizzle only emits this for tables that carry a policy, and this one has none
-- by design. Without it, privacy rests on the absence of a GRANT that any later
-- migration could add back.
alter table public.profile_usernames enable row level security;

-- ---------------------------------------------------------------------------
-- handle rules
-- ---------------------------------------------------------------------------

-- Paths that belong to the app itself. Without this a profile could claim
-- "login" and shadow the sign-in route.
--
-- Kept in sync with PROTECTED_ROUTES in proxy.ts, the signed-in half of this
-- list. If you add an app route, add it to both.
create or replace function public.username_is_reserved(candidate text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select lower(candidate) = any (array[
    'admin', 'api', 'about', 'account', 'auth', 'blog', 'dashboard', 'help',
    'login', 'logout', 'me', 'pricing', 'privacy', 'settings', 'signin',
    'signout', 'signup', 'support', 'terms', 'www'
  ]);
$$;

-- One definition so the policy has a single place to change.
create or replace function public.username_cooldown()
returns interval
language sql
immutable
set search_path = ''
as $$
  select interval '30 days';
$$;

-- Trims and lowercases the same way everywhere, so a handle written as "  Budi "
-- and one written as "budi" are the same handle rather than two.
create or replace function public.normalize_handle(candidate text)
returns text
language sql
immutable
set search_path = ''
as $$
  select lower(trim(both '-' from btrim(candidate)));
$$;

-- The single source of truth for availability; the trigger and the signup path
-- both call it so the rule cannot drift. SECURITY DEFINER because callers have no
-- SELECT on profile_usernames, and returning one boolean leaks no history.
create or replace function public.is_username_available(candidate text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not exists (
    select 1
    from public.profile_usernames
    where username = public.normalize_handle(candidate)
      and (
        released_at is null
        or released_at > now() - public.username_cooldown()
      )
  );
$$;

revoke all on function public.is_username_available(text) from public;
grant execute on function public.is_username_available(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- validate before write
-- ---------------------------------------------------------------------------

-- Normalizes, then rejects handles that are reserved or unavailable. Raising
-- here means the caller sees a readable message instead of a raw 23505 from the
-- unique index, and the AFTER trigger never runs.
create or replace function public.validate_username()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.username := public.normalize_handle(new.username);

  if public.username_is_reserved(new.username) then
    raise exception 'That username is reserved.'
      using errcode = 'check_violation';
  end if;

  -- Skipped on UPDATE when the handle is unchanged, otherwise every unrelated
  -- profile edit (a bio change, an avatar upload) would fail while the user is
  -- mid-rename.
  if tg_op = 'INSERT' or new.username is distinct from old.username then
    if not public.is_username_available(new.username) then
      raise exception 'That username is taken or still in cooldown.'
        using errcode = 'check_violation';
    end if;
  end if;

  return new;
end;
$$;

create trigger profiles_validate_username
  before insert or update of username on public.profiles
  for each row execute function public.validate_username();

-- ---------------------------------------------------------------------------
-- record ownership
-- ---------------------------------------------------------------------------

-- SECURITY DEFINER so this can write to profile_usernames, which RLS otherwise
-- denies. Runs inside the caller's transaction, so the cache and the history
-- cannot diverge.
create or replace function public.record_username_history()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    if new.username is not distinct from old.username then
      return new;
    end if;

    -- Close the outgoing handle. released_at is what starts the cooldown.
    update public.profile_usernames
       set released_at = now()
     where profile_id = new.id
       and username = old.username
       and released_at is null;
  end if;

  insert into public.profile_usernames (username, profile_id)
  values (new.username, new.id);

  return new;
end;
$$;

create trigger profiles_record_username_history
  after insert or update of username on public.profiles
  for each row execute function public.record_username_history();

-- ---------------------------------------------------------------------------
-- updated_at
-- ---------------------------------------------------------------------------

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

create trigger links_touch_updated_at
  before update on public.links
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- profile bootstrap on signup
-- ---------------------------------------------------------------------------

-- Creating the profile here rather than lazily on first request means two
-- concurrent requests can never both try to create it.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  base text;
  candidate text;
  suffix integer := 0;
begin
  base := public.normalize_handle(
    regexp_replace(
      lower(split_part(coalesce(new.email, new.id::text), '@', 1)),
      '[^a-z0-9_-]+', '-', 'g'
    )
  );

  if char_length(base) < 3 then
    base := 'user';
  end if;

  base := left(base, 24);
  candidate := base;

  while not public.is_username_available(candidate) loop
    suffix := suffix + 1;
    candidate := left(base, 28 - char_length(suffix::text)) || suffix::text;
  end loop;

  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    candidate,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'display_name', ''),
      split_part(coalesce(new.email, ''), '@', 1)
    )
  );

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

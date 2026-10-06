ALTER TABLE "profile_usernames" ADD COLUMN "reserved_until" timestamp with time zone;--> statement-breakpoint
-- Username release becomes opt-in: a rename normally frees the old handle at
-- once, and only holds it for 30 days when the owner asks for that.
--
-- The hold used to be implicit: `is_username_available` treated any handle
-- released within the last 30 days as taken. That conflates "the previous owner
-- still wants it" with "nobody asked to keep it", and the new rule needs the
-- distinction. An explicit `reserved_until` carries it.

-- Backfill: every handle currently inside the 30-day window was released under
-- the old implicit rule, so keep it reserved for whatever the window has left.
-- Anything already past the window becomes immediately free.
UPDATE public.profile_usernames
   SET reserved_until = released_at + public.username_cooldown()
 WHERE released_at IS NOT NULL
   AND released_at > now() - public.username_cooldown();--> statement-breakpoint

-- Rewritten from "no row within the cooldown" to "no *other* profile holds or
-- reserves it". The old one-argument version is dropped so no stale overload
-- lingers for the RPC to resolve against.
DROP FUNCTION IF EXISTS public.is_username_available(text);--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.is_username_available(
  candidate text,
  for_profile_id uuid default null
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  select not exists (
    select 1
    from public.profile_usernames
    where username = public.normalize_handle(candidate)
      and profile_id is distinct from for_profile_id
      and (
        released_at is null
        or reserved_until > now()
      )
  );
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION public.is_username_available(text, uuid) FROM public;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.is_username_available(text, uuid) TO anon, authenticated;--> statement-breakpoint

-- The reclaimer's own profile id is passed through, so reclaiming a reserved
-- handle no longer reads as "taken".
CREATE OR REPLACE FUNCTION public.validate_username()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
begin
  new.username := public.normalize_handle(new.username);

  if public.username_is_reserved(new.username) then
    raise exception 'That username is reserved.'
      using errcode = 'check_violation';
  end if;

  if tg_op = 'INSERT' or new.username is distinct from old.username then
    if not public.is_username_available(new.username, new.id) then
      raise exception 'That username is taken or still in cooldown.'
        using errcode = 'check_violation';
    end if;
  end if;

  return new;
end;
$$;--> statement-breakpoint

-- Whether a rename keeps the outgoing handle is a per-operation choice, read
-- from a transaction-local GUC the rename action sets:
--   set_config('rinku.keep_old_username', 'true', true)
-- Absent or anything else means release immediately.
CREATE OR REPLACE FUNCTION public.record_username_history()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
declare
  keep boolean := coalesce(
    nullif(current_setting('rinku.keep_old_username', true), ''),
    'false'
  )::boolean;
begin
  if tg_op = 'UPDATE' then
    if new.username is not distinct from old.username then
      return new;
    end if;

    update public.profile_usernames
       set released_at = now(),
           reserved_until = case
             when keep then now() + public.username_cooldown()
             else null
           end
     where profile_id = new.id
       and username = old.username
       and released_at is null;
  end if;

  insert into public.profile_usernames (username, profile_id)
  values (new.username, new.id);

  return new;
end;
$$;--> statement-breakpoint

-- Past handles are private (the table has RLS with no policy), so the owner
-- reads them through a definer function rather than a direct select.
CREATE OR REPLACE FUNCTION public.list_username_history()
RETURNS table (
  username text,
  released_at timestamp with time zone,
  reserved_until timestamp with time zone,
  status text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  select
    h.username,
    h.released_at,
    h.reserved_until,
    case
      when exists (
        select 1
        from public.profile_usernames active
        where active.username = h.username
          and active.released_at is null
      ) then 'taken'
      when h.reserved_until > now() then 'reserved'
      else 'free'
    end
  from public.profile_usernames h
  where h.released_at is not null
    and exists (
      select 1
      from public.profiles p
      where p.id = h.profile_id
        and p.user_id = (select auth.uid())
    )
    -- A handle the owner has since re-held is no longer past; drop the older
    -- released row so it does not show up as reclaimable.
    and not exists (
      select 1
      from public.profile_usernames held
      where held.username = h.username
        and held.profile_id = h.profile_id
        and held.released_at is null
    )
  order by h.released_at desc;
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION public.list_username_history() FROM public;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.list_username_history() TO authenticated;

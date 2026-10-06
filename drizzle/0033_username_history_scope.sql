-- Scope the username-history read to one profile.
--
-- The history list lives on a profile's settings page, and reclaiming a handle
-- renames *that* profile. The first version of `list_username_history` was
-- account-wide, so on a multi-profile account a handle reserved by another of
-- the user's profiles showed up as reclaimable but the rename trigger refused
-- it. Filtering to the requesting profile removes the contradiction.

drop function if exists public.list_username_history();

create or replace function public.list_username_history(p_profile_id uuid)
returns table (
  username text,
  released_at timestamp with time zone,
  reserved_until timestamp with time zone,
  status text
)
language sql
stable
security definer
set search_path = ''
as $$
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
  where h.profile_id = p_profile_id
    and h.released_at is not null
    -- The caller must own the profile being read.
    and exists (
      select 1
      from public.profiles p
      where p.id = p_profile_id
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
$$;

revoke all on function public.list_username_history(uuid) from public;
grant execute on function public.list_username_history(uuid) to authenticated;

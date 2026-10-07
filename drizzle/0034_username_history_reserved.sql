-- Username history shows only handles still reserved for the owner.
--
-- The list is the reclaim surface, and reclaiming is only meant to apply to
-- handles the owner chose to keep. A handle released immediately (the default)
-- is gone for good, so listing it (even with a Reclaim button) contradicted
-- the "keep it for 30 days or release it now" choice that produced it.
--
-- The `status` column stays in the shape for a stable client contract; with the
-- free and taken rows filtered out it is always 'reserved'.

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
    'reserved'::text as status
  from public.profile_usernames h
  where h.profile_id = p_profile_id
    -- Still inside its reservation window.
    and h.reserved_until > now()
    -- The caller must own the profile being read.
    and exists (
      select 1
      from public.profiles p
      where p.id = p_profile_id
        and p.user_id = (select auth.uid())
    )
    -- A handle the owner has since re-held is not a past handle; drop the old
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

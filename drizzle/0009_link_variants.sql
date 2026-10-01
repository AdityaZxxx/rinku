-- The link display variants, plus the column the editor persists its fetched
-- thumbnails into.
--
-- `variant` picks the rendering: `classic` is a standard row, `featured` a large
-- card with its thumbnail. `image_url` keeps the remote og:image URL as-is —
-- no storage, no download, so the origin keeps serving the bytes.

create type public.link_variant as enum ('classic', 'featured');
alter table links add column image_url text;
alter table links add column variant public.link_variant default 'classic' not null;

-- Positions were reserved sparse but never written, so every row sat at 0 and
-- the order leaned on the created_at tiebreaker alone. Dense ×1000 gives the
-- midpoint reordering room: a drag only rewrites the rows whose spot changed.
with ordered as (
  select id, (row_number() over (order by created_at, id) - 1) * 1000 as position
  from links
)
update links set position = ordered.position from ordered where links.id = ordered.id;

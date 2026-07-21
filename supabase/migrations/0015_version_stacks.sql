-- ============================================================================
-- 0015 — Version stacks on public share links
-- ============================================================================
-- Studio uploads can now stack as versions (assets.version_of → stack root).
-- Clients should always receive the NEWEST cut, so share_list_assets returns
-- one row per stack with the HEAD version's id/filename/mime/size. share_file
-- needs no change: it already accepts any asset in the link's project, and
-- version rows live in the same project as their root.
-- ============================================================================

create or replace function public.share_list_assets(p_link_id uuid, p_folder uuid, p_by_folder boolean)
returns table (
  id uuid, filename text, mime text, size_bytes bigint,
  pos int, created_at timestamptz, thumb_kind text
)
language sql security definer set search_path = public, extensions stable as $$
  with lp as (
    select s.project_id from share_links s
    where s.id = p_link_id and s.revoked_at is null
      and (s.expires_at is null or s.expires_at > now())
  )
  select head.id, head.filename, head.mime, head.size_bytes,
    a.position, a.created_at,
    (select r.kind from renditions r
       where r.asset_id = head.id and r.kind in ('thumb','poster') and r.status = 'done'
       order by (r.kind = 'thumb') desc
       limit 1) as thumb_kind
  from assets a
  join lp on a.project_id = lp.project_id
  cross join lateral (
    select v.id, v.filename, v.mime, v.size_bytes
    from assets v
    where v.id = a.id or v.version_of = a.id
    order by v.version desc
    limit 1
  ) head
  where a.version_of is null
    and (not p_by_folder
         or (p_folder is null and a.folder_id is null)
         or (a.folder_id = p_folder))
  order by a.position, a.created_at
$$;

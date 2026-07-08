-- ── Public share access without the service role ───────────────────────────
-- Share links must work for anonymous visitors. Previously the public routes
-- used the service-role key to read past RLS; that couples client delivery to a
-- secret that must be perfect in the deploy env. Instead we expose a small set
-- of SECURITY DEFINER functions — the only door anon has to shared content.
-- Each re-checks the link is live (not revoked, not expired) on every call, so
-- there is no way to read a project except through a valid link.
--
-- Password model: a password-protected link's UUID is withheld from
-- share_resolve and only handed back by share_unlock on the correct password.
-- The link id (128-bit random) is therefore the capability: no password → no
-- id → no asset access. Passwords are hashed with pgcrypto bcrypt so the hash
-- never leaves the database.

-- Resolve a link by slug. Empty result = not found / revoked. For password
-- links, link_id is NULL until unlocked (so metadata can render the lock screen
-- without granting asset access).
create or replace function app.share_resolve(p_slug text)
returns table (
  link_id uuid, project_id uuid, title text, description text,
  kind project_kind, allow_downloads boolean, has_password boolean, expired boolean
)
language sql security definer set search_path = public, app, extensions stable as $$
  select
    case when s.password_hash is not null then null::uuid else s.id end,
    p.id, p.title, p.description, p.kind, s.allow_downloads,
    (s.password_hash is not null),
    (s.expires_at is not null and s.expires_at <= now())
  from share_links s
  join projects p on p.id = s.project_id
  where s.slug = p_slug and s.revoked_at is null
$$;

-- Exchange a password for the link id (the post-unlock capability). NULL on miss.
create or replace function app.share_unlock(p_slug text, p_password text)
returns uuid
language sql security definer set search_path = public, app, extensions stable as $$
  select s.id from share_links s
  where s.slug = p_slug
    and s.revoked_at is null
    and (s.expires_at is null or s.expires_at > now())
    and s.password_hash is not null
    and s.password_hash = crypt(p_password, s.password_hash)
$$;

-- Hash a new share password (used by the owner when creating a link).
create or replace function app.share_hash_password(p_password text)
returns text
language sql security definer set search_path = public, app, extensions as $$
  select crypt(p_password, gen_salt('bf'))
$$;

-- Folders of a link's project (drive navigation), only while the link is live.
create or replace function app.share_folders(p_link_id uuid)
returns table (id uuid, parent_id uuid, name text)
language sql security definer set search_path = public, app, extensions stable as $$
  select f.id, f.parent_id, f.name
  from folders f
  where f.project_id = (
    select s.project_id from share_links s
    where s.id = p_link_id and s.revoked_at is null
      and (s.expires_at is null or s.expires_at > now())
  )
  order by f.name
$$;

-- Assets of a link's project. p_by_folder=false returns everything (flat kinds);
-- true scopes to p_folder (NULL = project root). Live-link check inside.
create or replace function app.share_list_assets(p_link_id uuid, p_folder uuid, p_by_folder boolean)
returns table (
  id uuid, filename text, mime text, size_bytes bigint,
  pos int, created_at timestamptz, thumb_kind text
)
language sql security definer set search_path = public, app, extensions stable as $$
  with lp as (
    select s.project_id from share_links s
    where s.id = p_link_id and s.revoked_at is null
      and (s.expires_at is null or s.expires_at > now())
  )
  select a.id, a.filename, a.mime, a.size_bytes, a.position, a.created_at,
    (select r.kind from renditions r
       where r.asset_id = a.id and r.kind in ('thumb','poster') and r.status = 'done'
       order by (r.kind = 'thumb') desc
       limit 1) as thumb_kind
  from assets a
  join lp on a.project_id = lp.project_id
  where a.version_of is null
    and (not p_by_folder
         or (p_folder is null and a.folder_id is null)
         or (a.folder_id = p_folder))
  order by a.position, a.created_at
$$;

-- Resolve one file (original or a rendition) for a link. Empty result = 404.
create or replace function app.share_file(p_link_id uuid, p_asset_id uuid, p_rendition text)
returns table (storage_key text, mime text, filename text)
language sql security definer set search_path = public, app, extensions stable as $$
  with lp as (
    select s.project_id from share_links s
    where s.id = p_link_id and s.revoked_at is null
      and (s.expires_at is null or s.expires_at > now())
  ), a as (
    select * from assets
    where id = p_asset_id and project_id = (select project_id from lp)
  )
  select coalesce(r.storage_key, a.storage_key),
         coalesce(r.mime, a.mime),
         a.filename
  from a
  left join renditions r
    on p_rendition is not null and r.asset_id = a.id
       and r.kind = p_rendition and r.status = 'done'
  where p_rendition is null or r.id is not null
$$;

-- Record a public delivery event (proof of delivery).
create or replace function app.share_audit(p_link uuid, p_action text, p_meta jsonb, p_ip text, p_ua text)
returns void
language sql security definer set search_path = public, app, extensions as $$
  insert into audit_log (project_id, share_link_id, action, ip, user_agent, meta)
  select s.project_id, s.id, p_action,
    case when trim(split_part(coalesce(p_ip, ''), ',', 1)) ~ '^[0-9a-fA-F:.]+$'
         then trim(split_part(p_ip, ',', 1))::inet else null end,
    p_ua, coalesce(p_meta, '{}'::jsonb)
  from share_links s where s.id = p_link
$$;

-- Anon may call the read/consume gateway. The counter functions from 0003 stay
-- as-is but become anon-callable (they already enforce live-ness + caps).
grant execute on function app.share_resolve(text)                         to anon, authenticated;
grant execute on function app.share_unlock(text, text)                    to anon, authenticated;
grant execute on function app.share_hash_password(text)                   to authenticated;
grant execute on function app.share_folders(uuid)                         to anon, authenticated;
grant execute on function app.share_list_assets(uuid, uuid, boolean)      to anon, authenticated;
grant execute on function app.share_file(uuid, uuid, text)                to anon, authenticated;
grant execute on function app.share_audit(uuid, text, jsonb, text, text)  to anon, authenticated;
grant execute on function app.share_consume_download(uuid)                to anon, authenticated;
grant execute on function app.share_register_view(uuid)                   to anon, authenticated;

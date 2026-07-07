-- Server-side share-link enforcement. These run with the service role only
-- (the public share routes call them after resolving the link); the anon and
-- authenticated API roles are explicitly denied so a client can never inflate
-- or exhaust a link's counters directly.

-- Atomically consume one download iff the link is live (not revoked, not
-- expired, downloads allowed, under the max). Returns true only when consumed.
create or replace function app.share_consume_download(link uuid)
returns boolean
language plpgsql security definer set search_path = public, app as $$
declare ok boolean;
begin
  update share_links
     set download_count = download_count + 1
   where id = link
     and revoked_at is null
     and allow_downloads
     and (expires_at is null or expires_at > now())
     and (max_downloads is null or download_count < max_downloads)
  returning true into ok;
  return coalesce(ok, false);
end $$;

-- Register a view iff the link is live. Returns true when counted.
create or replace function app.share_register_view(link uuid)
returns boolean
language plpgsql security definer set search_path = public, app as $$
declare ok boolean;
begin
  update share_links
     set view_count = view_count + 1
   where id = link
     and revoked_at is null
     and (expires_at is null or expires_at > now())
  returning true into ok;
  return coalesce(ok, false);
end $$;

-- Lock these to the service role.
revoke execute on function app.share_consume_download(uuid) from anon, authenticated, public;
revoke execute on function app.share_register_view(uuid)   from anon, authenticated, public;
grant  execute on function app.share_consume_download(uuid) to service_role;
grant  execute on function app.share_register_view(uuid)   to service_role;

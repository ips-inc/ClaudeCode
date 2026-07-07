-- Deterministic share-link enforcement test (acceptance criteria).
-- Proves a link works while valid and returns NOTHING once revoked, expired,
-- over its download cap, or with downloads disabled. Rolls back via sentinel.
--
-- PASS = aborts with 'SHARE_LINK_TESTS_PASSED (N checks)'.

do $$
declare
  u_owner uuid := gen_random_uuid();
  cl      uuid := gen_random_uuid();
  proj    uuid := gen_random_uuid();
  l_valid uuid := gen_random_uuid();
  l_revok uuid := gen_random_uuid();
  l_exp   uuid := gen_random_uuid();
  l_nodl  uuid := gen_random_uuid();
  l_cap   uuid := gen_random_uuid();
  ok      boolean;
  checks  int := 0;
begin
  insert into auth.users (id, email, instance_id, aud, role)
  values (u_owner,'o2@test.local','00000000-0000-0000-0000-000000000000','authenticated','authenticated');
  insert into profiles (id, email, global_role) values (u_owner,'o2@test.local','owner')
    on conflict (id) do update set global_role='owner';
  insert into clients (id, name, slug) values (cl,'C','c-'||substr(cl::text,1,8));
  insert into projects (id, client_id, owner_id, kind, title, slug, published)
    values (proj, cl, u_owner, 'transfer','T','t-'||substr(proj::text,1,8), true);

  insert into share_links (id, project_id, slug, allow_downloads, expires_at, revoked_at, max_downloads, download_count, created_by) values
    (l_valid, proj,'s-valid', true,  null,                 null,      null, 0, u_owner),
    (l_revok, proj,'s-revok', true,  null,                 now(),     null, 0, u_owner),
    (l_exp,   proj,'s-exp',   true,  now() - interval '1h', null,     null, 0, u_owner),
    (l_nodl,  proj,'s-nodl',  false, null,                 null,      null, 0, u_owner),
    (l_cap,   proj,'s-cap',   true,  null,                 null,      1,    1, u_owner);  -- already at cap

  -- valid link consumes a download
  select app.share_consume_download(l_valid) into ok;
  if not ok then raise exception 'FAIL: valid link did not allow download'; end if;
  checks := checks + 1;

  -- revoked → denied
  select app.share_consume_download(l_revok) into ok;
  if ok then raise exception 'FAIL: revoked link allowed download'; end if;
  checks := checks + 1;

  -- expired → denied (download AND view)
  select app.share_consume_download(l_exp) into ok;
  if ok then raise exception 'FAIL: expired link allowed download'; end if;
  select app.share_register_view(l_exp) into ok;
  if ok then raise exception 'FAIL: expired link registered a view'; end if;
  checks := checks + 2;

  -- downloads disabled → denied even though live
  select app.share_consume_download(l_nodl) into ok;
  if ok then raise exception 'FAIL: downloads-disabled link allowed download'; end if;
  checks := checks + 1;

  -- at cap → denied
  select app.share_consume_download(l_cap) into ok;
  if ok then raise exception 'FAIL: capped link allowed download past max'; end if;
  checks := checks + 1;

  -- valid view works
  select app.share_register_view(l_valid) into ok;
  if not ok then raise exception 'FAIL: valid link did not register a view'; end if;
  checks := checks + 1;

  -- revoked view denied
  select app.share_register_view(l_revok) into ok;
  if ok then raise exception 'FAIL: revoked link registered a view'; end if;
  checks := checks + 1;

  raise exception 'SHARE_LINK_TESTS_PASSED (% checks)', checks;
end $$;

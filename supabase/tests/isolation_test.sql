-- Deterministic multi-tenant isolation test (acceptance criteria M1/M6).
--
-- Creates two clients with their own users, projects, and assets, then
-- impersonates each identity (via role + request.jwt.claims, exactly how
-- Supabase auth presents a request) and asserts RLS lets each party see ONLY
-- what it should. Everything runs in one transaction and is rolled back by a
-- sentinel RAISE at the end, so it leaves no residue and can be re-run.
--
-- Run: psql "$DATABASE_URL" -f supabase/tests/isolation_test.sql
-- PASS = the transaction aborts with message 'ISOLATION_TESTS_PASSED (N checks)'.
-- FAIL = it aborts with the specific failed assertion.

do $$
declare
  u_owner uuid := gen_random_uuid();
  u_a     uuid := gen_random_uuid();
  u_b     uuid := gen_random_uuid();
  cl_a    uuid := gen_random_uuid();
  cl_b    uuid := gen_random_uuid();
  p_a_pub uuid := gen_random_uuid();
  p_a_drf uuid := gen_random_uuid();
  p_b_pub uuid := gen_random_uuid();
  as_a    uuid := gen_random_uuid();
  as_b    uuid := gen_random_uuid();
  n       int;
  checks  int := 0;

  procedure_note text;
begin
  -- ---- Fixtures (as the privileged migration role) --------------------------
  insert into auth.users (id, email, instance_id, aud, role)
  values (u_owner,'owner@test.local','00000000-0000-0000-0000-000000000000','authenticated','authenticated'),
         (u_a,'a@test.local','00000000-0000-0000-0000-000000000000','authenticated','authenticated'),
         (u_b,'b@test.local','00000000-0000-0000-0000-000000000000','authenticated','authenticated');

  -- upsert in case a handle_new_user trigger already inserted a profile row
  insert into profiles (id, email, global_role) values
    (u_owner,'owner@test.local','owner'),
    (u_a,'a@test.local','client'),
    (u_b,'b@test.local','client')
  on conflict (id) do update set global_role = excluded.global_role, email = excluded.email;

  insert into clients (id, name, slug) values
    (cl_a,'Client A','client-a-'||substr(cl_a::text,1,8)),
    (cl_b,'Client B','client-b-'||substr(cl_b::text,1,8));

  insert into memberships (user_id, client_id, role) values
    (u_a, cl_a, 'client'),
    (u_b, cl_b, 'client');

  insert into projects (id, client_id, owner_id, kind, title, slug, published) values
    (p_a_pub, cl_a, u_owner, 'gallery','A published','pa-pub-'||substr(p_a_pub::text,1,8), true),
    (p_a_drf, cl_a, u_owner, 'gallery','A draft','pa-drf-'||substr(p_a_drf::text,1,8), false),
    (p_b_pub, cl_b, u_owner, 'gallery','B published','pb-pub-'||substr(p_b_pub::text,1,8), true);

  insert into assets (id, project_id, filename, storage_key, mime, size_bytes) values
    (as_a, p_a_pub, 'a.jpg','clients/'||cl_a||'/a.jpg','image/jpeg',1),
    (as_b, p_b_pub, 'b.jpg','clients/'||cl_b||'/b.jpg','image/jpeg',1);

  -- Helper to impersonate a user for the checks below.
  -- (set_config local = resets at COMMIT/ROLLBACK)

  -- ==== Client A sees only client A's PUBLISHED project ======================
  perform set_config('request.jwt.claims', json_build_object('sub',u_a,'role','authenticated')::text, true);
  execute 'set local role authenticated';

  select count(*) into n from projects;
  if n <> 1 then raise exception 'FAIL: client A should see 1 project, saw %', n; end if;
  checks := checks + 1;

  select count(*) into n from projects where id = p_a_pub;
  if n <> 1 then raise exception 'FAIL: client A cannot see its own published project'; end if;
  checks := checks + 1;

  select count(*) into n from projects where id = p_a_drf;
  if n <> 0 then raise exception 'FAIL: client A saw its client''s DRAFT (unpublished) project'; end if;
  checks := checks + 1;

  select count(*) into n from projects where id = p_b_pub;   -- IDOR attempt
  if n <> 0 then raise exception 'FAIL: client A saw client B''s project by id (IDOR)'; end if;
  checks := checks + 1;

  select count(*) into n from assets where id = as_b;         -- IDOR attempt
  if n <> 0 then raise exception 'FAIL: client A saw client B''s asset by id (IDOR)'; end if;
  checks := checks + 1;

  select count(*) into n from assets;
  if n <> 1 then raise exception 'FAIL: client A should see 1 asset, saw %', n; end if;
  checks := checks + 1;

  -- client is read-only: writing an asset must be denied
  begin
    insert into assets (project_id, filename, storage_key, mime, size_bytes)
    values (p_a_pub, 'x.jpg','clients/'||cl_a||'/x.jpg','image/jpeg',1);
    raise exception 'FAIL: client A was allowed to INSERT an asset';
  exception when insufficient_privilege or check_violation then
    checks := checks + 1;  -- expected: RLS blocked the write
  end;

  execute 'reset role';

  -- ==== Client B sees only client B ========================================
  perform set_config('request.jwt.claims', json_build_object('sub',u_b,'role','authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from projects;
  if n <> 1 then raise exception 'FAIL: client B should see 1 project, saw %', n; end if;
  select count(*) into n from projects where id = p_a_pub;
  if n <> 0 then raise exception 'FAIL: client B saw client A''s project (IDOR)'; end if;
  checks := checks + 2;
  execute 'reset role';

  -- ==== Anonymous sees nothing =============================================
  perform set_config('request.jwt.claims', '', true);
  execute 'set local role anon';
  select count(*) into n from projects;
  if n <> 0 then raise exception 'FAIL: anon saw % projects', n; end if;
  select count(*) into n from assets;
  if n <> 0 then raise exception 'FAIL: anon saw % assets', n; end if;
  select count(*) into n from clients;
  if n <> 0 then raise exception 'FAIL: anon saw % clients', n; end if;
  checks := checks + 3;
  execute 'reset role';

  -- ==== Owner sees everything ==============================================
  perform set_config('request.jwt.claims', json_build_object('sub',u_owner,'role','authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from projects where id in (p_a_pub,p_a_drf,p_b_pub);
  if n <> 3 then raise exception 'FAIL: owner should see all 3 projects, saw %', n; end if;
  select count(*) into n from assets where id in (as_a,as_b);
  if n <> 2 then raise exception 'FAIL: owner should see both assets, saw %', n; end if;
  checks := checks + 2;
  execute 'reset role';

  -- All good — abort to roll back the fixtures.
  raise exception 'ISOLATION_TESTS_PASSED (% checks)', checks;
end $$;

-- Repeatable client-isolation test for the multi-tenant RLS spine.
-- Seeds two isolated tenants, impersonates each role at the DB level (exactly
-- how PostgREST enforces RLS), asserts what each can see, then cleans up.
-- Run with: supabase db execute < supabase/tests/isolation.sql  (or the SQL editor).
-- Every row of the final result must have pass = true.
begin;

insert into auth.users (instance_id, id, aud, role, email, created_at, updated_at)
values
 ('00000000-0000-0000-0000-000000000000','11111111-1111-1111-1111-111111111111','authenticated','authenticated','owner@studio.test', now(), now()),
 ('00000000-0000-0000-0000-000000000000','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','authenticated','authenticated','a@client.test', now(), now()),
 ('00000000-0000-0000-0000-000000000000','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','authenticated','authenticated','b@client.test', now(), now()),
 ('00000000-0000-0000-0000-000000000000','cccccccc-cccc-cccc-cccc-cccccccccccc','authenticated','authenticated','outsider@nobody.test', now(), now());

insert into clients (id, name, slug) values
 ('a1111111-1111-1111-1111-111111111111','Client A','client-a'),
 ('b1111111-1111-1111-1111-111111111111','Client B','client-b');

insert into memberships (user_id, client_id, role) values
 ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','a1111111-1111-1111-1111-111111111111','client'),
 ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','b1111111-1111-1111-1111-111111111111','client');

insert into projects (id, client_id, kind, title, slug, published) values
 ('a2222222-2222-2222-2222-222222222222','a1111111-1111-1111-1111-111111111111','gallery','A Delivery','proj-a', true),
 ('b2222222-2222-2222-2222-222222222222','b1111111-1111-1111-1111-111111111111','gallery','B Delivery','proj-b', true),
 ('b3333333-3333-3333-3333-333333333333','b1111111-1111-1111-1111-111111111111','gallery','B Draft','proj-b-draft', false);

insert into assets (id, project_id, filename, storage_key) values
 ('a4444444-4444-4444-4444-444444444444','a2222222-2222-2222-2222-222222222222','a.jpg','a1111111/a4/a.jpg'),
 ('b4444444-4444-4444-4444-444444444444','b2222222-2222-2222-2222-222222222222','b.jpg','b1111111/b4/b.jpg');

create table if not exists _isolation_results (name text, got int, want int);
truncate _isolation_results;
grant insert on _isolation_results to authenticated, anon;

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}', true);
insert into _isolation_results select 'A_sees_own_projects', count(*), 1 from projects;
insert into _isolation_results select 'A_cannot_see_B_projects', count(*), 0 from projects where client_id='b1111111-1111-1111-1111-111111111111';
insert into _isolation_results select 'A_cannot_see_B_asset_by_id', count(*), 0 from assets where id='b4444444-4444-4444-4444-444444444444';
reset role;

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb","role":"authenticated"}', true);
insert into _isolation_results select 'B_sees_published_only', count(*), 1 from projects;
insert into _isolation_results select 'B_cannot_see_draft', count(*), 0 from projects where id='b3333333-3333-3333-3333-333333333333';
insert into _isolation_results select 'B_cannot_see_A_asset_by_id', count(*), 0 from assets where id='a4444444-4444-4444-4444-444444444444';
reset role;

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
insert into _isolation_results select 'owner_sees_all_projects', count(*), 3 from projects;
insert into _isolation_results select 'owner_sees_all_assets', count(*), 2 from assets;
reset role;

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"cccccccc-cccc-cccc-cccc-cccccccccccc","role":"authenticated"}', true);
insert into _isolation_results select 'outsider_sees_no_projects', count(*), 0 from projects;
insert into _isolation_results select 'outsider_sees_no_assets', count(*), 0 from assets;
reset role;

set local role anon;
select set_config('request.jwt.claims','{"role":"anon"}', true);
insert into _isolation_results select 'anon_sees_no_projects', count(*), 0 from projects;
insert into _isolation_results select 'anon_sees_no_assets', count(*), 0 from assets;
insert into _isolation_results select 'anon_sees_no_clients', count(*), 0 from clients;
reset role;

delete from clients where id in ('a1111111-1111-1111-1111-111111111111','b1111111-1111-1111-1111-111111111111');
delete from auth.users where id in (
 '11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','cccccccc-cccc-cccc-cccc-cccccccccccc');

select name, got, want, (got = want) as pass from _isolation_results order by pass, name;
drop table _isolation_results;

commit;
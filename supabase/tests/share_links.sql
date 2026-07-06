-- Repeatable share-link enforcement test. Proves a link works while live and is
-- denied once revoked / expired / over max-downloads / downloads-off.
-- Every row of the final result must have pass = true.
begin;

insert into clients (id, name, slug) values ('c0000000-0000-0000-0000-000000000001','T','t');
insert into projects (id, client_id, kind, title, slug, published)
  values ('c0000000-0000-0000-0000-000000000002','c0000000-0000-0000-0000-000000000001','transfer','T','tp', true);

insert into share_links (id, project_id, slug, allow_downloads, expires_at, max_downloads, download_count, revoked_at) values
 ('50000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000002','live',    true,  now()+interval '1 day', null, 0, null),
 ('50000000-0000-0000-0000-000000000002','c0000000-0000-0000-0000-000000000002','revoked', true,  now()+interval '1 day', null, 0, now()),
 ('50000000-0000-0000-0000-000000000003','c0000000-0000-0000-0000-000000000002','expired', true,  now()-interval '1 day', null, 0, null),
 ('50000000-0000-0000-0000-000000000004','c0000000-0000-0000-0000-000000000002','maxed',   true,  now()+interval '1 day', 2,    2, null),
 ('50000000-0000-0000-0000-000000000005','c0000000-0000-0000-0000-000000000002','nodl',    false, now()+interval '1 day', null, 0, null);

create temp table r (name text, got boolean, want boolean) on commit drop;
insert into r select 'live_download_consumes',   app.share_consume_download('50000000-0000-0000-0000-000000000001'), true;
insert into r select 'revoked_download_denied',  app.share_consume_download('50000000-0000-0000-0000-000000000002'), false;
insert into r select 'expired_download_denied',  app.share_consume_download('50000000-0000-0000-0000-000000000003'), false;
insert into r select 'maxed_download_denied',    app.share_consume_download('50000000-0000-0000-0000-000000000004'), false;
insert into r select 'downloads_off_denied',     app.share_consume_download('50000000-0000-0000-0000-000000000005'), false;
insert into r select 'live_view_counts',         app.share_register_view('50000000-0000-0000-0000-000000000001'), true;
insert into r select 'revoked_view_denied',      app.share_register_view('50000000-0000-0000-0000-000000000002'), false;
insert into r select 'expired_view_denied',      app.share_register_view('50000000-0000-0000-0000-000000000003'), false;
insert into r select 'live_second_download_ok',  app.share_consume_download('50000000-0000-0000-0000-000000000001'), true;

select name, got, want, (got = want) as pass from r order by pass, name;
rollback;

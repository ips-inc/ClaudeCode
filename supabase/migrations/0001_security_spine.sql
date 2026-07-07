-- ============================================================================
-- Studio Media Cloud — M1: Multi-tenant security spine
-- ============================================================================
-- Isolation model:
--   * profiles.global_role ∈ {owner, collaborator, client}
--   * clients are the isolation boundary; memberships map user ↔ client
--   * owner sees everything; collaborators/clients see only clients they belong to
--   * client-role users additionally only see PUBLISHED projects (deliveries)
--   * anon role gets NO row access at all — public share pages are served by
--     server routes that validate a share link and use the service role.
--
-- Enforcement is RLS on every table, driven by SECURITY DEFINER helper
-- functions in the `app` schema that look up membership without recursing
-- through RLS. A missing policy = deny (RLS default), so every table is
-- explicitly enabled and given policies below.
-- ============================================================================

create schema if not exists app;

create type user_role       as enum ('owner', 'collaborator', 'client');
create type membership_role as enum ('collaborator', 'client');
create type project_kind    as enum ('gallery', 'review', 'transfer', 'drive');
create type job_type        as enum ('transcode', 'transcribe');
create type job_status      as enum ('queued', 'running', 'done', 'error');
create type scan_status     as enum ('pending', 'clean', 'flagged', 'skipped');

-- ---------------------------------------------------------------------------
-- Identity & tenancy
-- ---------------------------------------------------------------------------
create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  full_name   text,
  global_role user_role not null default 'client',
  created_at  timestamptz not null default now()
);

create table clients (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  archived_at timestamptz,
  created_at  timestamptz not null default now()
);

create table memberships (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles(id) on delete cascade,
  client_id  uuid not null references clients(id) on delete cascade,
  role       membership_role not null default 'client',
  created_at timestamptz not null default now(),
  unique (user_id, client_id)
);
create index memberships_user_idx   on memberships (user_id);
create index memberships_client_idx on memberships (client_id);

-- ---------------------------------------------------------------------------
-- Content
-- ---------------------------------------------------------------------------
create table projects (
  id             uuid primary key default gen_random_uuid(),
  client_id      uuid not null references clients(id) on delete cascade,
  owner_id       uuid references profiles(id) on delete set null,
  kind           project_kind not null,
  title          text not null,
  slug           text not null unique,
  description    text,
  cover_asset_id uuid,
  settings       jsonb not null default '{}'::jsonb,
  published      boolean not null default false,  -- client-visibility gate
  archived_at    timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index projects_client_idx on projects (client_id);

create table folders (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  parent_id  uuid references folders(id) on delete cascade,
  name       text not null,
  created_at timestamptz not null default now()
);
create index folders_project_idx on folders (project_id, parent_id);

create table assets (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references projects(id) on delete cascade,
  folder_id    uuid references folders(id) on delete set null,
  filename     text not null,
  -- S3-compatible object key in the media store (R2/MinIO). Never public.
  storage_key  text not null unique,
  mime         text not null default 'application/octet-stream',
  size_bytes   bigint not null default 0,
  checksum     text,
  width        int,
  height       int,
  duration_s   numeric,
  fps          numeric,
  version      int not null default 1,
  version_of   uuid references assets(id) on delete cascade,
  position     int not null default 0,
  scan_status  scan_status not null default 'pending',
  created_at   timestamptz not null default now()
);
create index assets_project_idx    on assets (project_id, position);
create index assets_version_of_idx on assets (version_of);

alter table projects
  add constraint projects_cover_asset_fk
  foreign key (cover_asset_id) references assets(id) on delete set null;

-- Transcoded renditions + scrubbing proxy + poster (produced by the worker).
create table renditions (
  id          uuid primary key default gen_random_uuid(),
  asset_id    uuid not null references assets(id) on delete cascade,
  kind        text not null,               -- proxy | 1080p | 720p | poster | thumb
  storage_key text not null unique,
  mime        text not null default 'application/octet-stream',
  width       int,
  height      int,
  bitrate     int,
  size_bytes  bigint,
  status      job_status not null default 'done',
  created_at  timestamptz not null default now(),
  unique (asset_id, kind)
);
create index renditions_asset_idx on renditions (asset_id);

-- Self-hosted Whisper output.
create table transcripts (
  id         uuid primary key default gen_random_uuid(),
  asset_id   uuid not null references assets(id) on delete cascade,
  language   text,
  status     job_status not null default 'done',
  full_text  text,
  search_tsv tsvector,
  vtt_key    text,
  srt_key    text,
  created_at timestamptz not null default now(),
  unique (asset_id)
);
create index transcripts_search_idx on transcripts using gin (search_tsv);

create table transcript_segments (
  id            uuid primary key default gen_random_uuid(),
  transcript_id uuid not null references transcripts(id) on delete cascade,
  start_s       numeric not null,
  end_s         numeric not null,
  text          text not null,
  words         jsonb,                     -- word-level timestamps
  search_tsv    tsvector
);
create index transcript_segments_tid_idx    on transcript_segments (transcript_id, start_s);
create index transcript_segments_search_idx on transcript_segments using gin (search_tsv);

-- ---------------------------------------------------------------------------
-- Sharing, review, audit
-- ---------------------------------------------------------------------------
create table share_links (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references projects(id) on delete cascade,
  slug            text not null unique,     -- high-entropy, non-sequential
  label           text,
  password_hash   text,
  expires_at      timestamptz,
  allow_downloads boolean not null default true,
  allow_comments  boolean not null default true,
  allow_favorites boolean not null default true,
  max_downloads   int,
  download_count  int not null default 0,
  view_count      int not null default 0,
  revoked_at      timestamptz,
  created_by      uuid references profiles(id) on delete set null,
  created_at      timestamptz not null default now()
);
create index share_links_project_idx on share_links (project_id);

create table comments (
  id             uuid primary key default gen_random_uuid(),
  asset_id       uuid not null references assets(id) on delete cascade,
  parent_id      uuid references comments(id) on delete cascade,
  share_link_id  uuid references share_links(id) on delete set null,
  author_id      uuid references profiles(id) on delete set null,
  author_name    text not null default 'Client',
  is_admin       boolean not null default false,
  body           text not null,
  timecode_s     numeric,                  -- seconds into the media
  frame          int,                      -- frame-accurate anchor
  fps            numeric,                  -- fps the frame was captured at
  resolved_at    timestamptz,
  created_at     timestamptz not null default now()
);
create index comments_asset_idx on comments (asset_id, created_at);

create table favorites (
  id            uuid primary key default gen_random_uuid(),
  share_link_id uuid references share_links(id) on delete cascade,
  asset_id      uuid not null references assets(id) on delete cascade,
  user_id       uuid references profiles(id) on delete cascade,
  client_name   text,
  created_at    timestamptz not null default now()
);
create unique index favorites_link_asset_idx on favorites (share_link_id, asset_id)
  where share_link_id is not null;

create table audit_log (
  id            bigint generated always as identity primary key,
  project_id    uuid references projects(id) on delete cascade,
  client_id     uuid references clients(id) on delete cascade,
  actor_id      uuid references profiles(id) on delete set null,
  share_link_id uuid references share_links(id) on delete set null,
  action        text not null,             -- view | download | comment | favorite | ...
  object_type   text,
  object_id     uuid,
  ip            inet,
  user_agent    text,
  meta          jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);
create index audit_project_idx on audit_log (project_id, created_at desc);

create table jobs (
  id          uuid primary key default gen_random_uuid(),
  asset_id    uuid not null references assets(id) on delete cascade,
  type        job_type not null,
  status      job_status not null default 'queued',
  attempts    int not null default 0,
  error       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index jobs_status_idx on jobs (status, created_at);

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function app.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end $$;

create trigger projects_touch before update on projects
  for each row execute function app.touch_updated_at();
create trigger jobs_touch before update on jobs
  for each row execute function app.touch_updated_at();

-- ---------------------------------------------------------------------------
-- New-user hook: create a profile row for every auth signup.
-- First user ever becomes the owner; everyone else defaults to client.
-- ---------------------------------------------------------------------------
create or replace function app.handle_new_user() returns trigger
language plpgsql security definer set search_path = public, app as $$
declare first_user boolean;
begin
  select count(*) = 0 into first_user from profiles;
  insert into profiles (id, email, global_role)
  values (new.id, new.email,
          (case when first_user then 'owner' else 'client' end)::user_role);
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function app.handle_new_user();

-- ---------------------------------------------------------------------------
-- Authorization helpers (SECURITY DEFINER: bypass RLS to resolve membership).
-- ---------------------------------------------------------------------------
create or replace function app.global_role() returns user_role
language sql stable security definer set search_path = public, app as $$
  select global_role from profiles where id = auth.uid();
$$;

create or replace function app.is_owner() returns boolean
language sql stable security definer set search_path = public, app as $$
  select coalesce((select global_role = 'owner' from profiles where id = auth.uid()), false);
$$;

create or replace function app.is_client() returns boolean
language sql stable security definer set search_path = public, app as $$
  select coalesce((select global_role = 'client' from profiles where id = auth.uid()), false);
$$;

create or replace function app.has_client_access(cid uuid) returns boolean
language sql stable security definer set search_path = public, app as $$
  select app.is_owner()
      or exists (select 1 from memberships m
                 where m.user_id = auth.uid() and m.client_id = cid);
$$;

-- Project access: owner always; members of the project's client; client-role
-- users only when the project is published (a delivered gallery/review/etc).
create or replace function app.has_project_access(pid uuid) returns boolean
language sql stable security definer set search_path = public, app as $$
  select app.is_owner()
      or exists (
        select 1
        from projects p
        join memberships m on m.client_id = p.client_id and m.user_id = auth.uid()
        where p.id = pid
          and (p.published or app.global_role() <> 'client')
      );
$$;

create or replace function app.asset_project(aid uuid) returns uuid
language sql stable security definer set search_path = public, app as $$
  select project_id from assets where id = aid;
$$;

-- ---------------------------------------------------------------------------
-- Enable RLS everywhere (default deny) + policies.
-- ---------------------------------------------------------------------------
alter table profiles            enable row level security;
alter table clients             enable row level security;
alter table memberships         enable row level security;
alter table projects            enable row level security;
alter table folders             enable row level security;
alter table assets              enable row level security;
alter table renditions          enable row level security;
alter table transcripts         enable row level security;
alter table transcript_segments enable row level security;
alter table share_links         enable row level security;
alter table comments            enable row level security;
alter table favorites           enable row level security;
alter table audit_log           enable row level security;
alter table jobs                enable row level security;

-- profiles: read self (or owner reads all); update self; owner manages all.
create policy profiles_select on profiles for select to authenticated
  using (id = auth.uid() or app.is_owner());
create policy profiles_update_self on profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_owner_all on profiles for all to authenticated
  using (app.is_owner()) with check (app.is_owner());

-- clients: owner manages all; members may read their own clients.
create policy clients_owner_all on clients for all to authenticated
  using (app.is_owner()) with check (app.is_owner());
create policy clients_member_select on clients for select to authenticated
  using (app.has_client_access(id));

-- memberships: owner manages all; users read their own.
create policy memberships_owner_all on memberships for all to authenticated
  using (app.is_owner()) with check (app.is_owner());
create policy memberships_select_self on memberships for select to authenticated
  using (user_id = auth.uid());

-- projects: owner+collaborators write within their clients; visibility gated.
create policy projects_select on projects for select to authenticated
  using (app.has_project_access(id));
create policy projects_owner_all on projects for all to authenticated
  using (app.is_owner()) with check (app.is_owner());
create policy projects_collab_write on projects for all to authenticated
  using (not app.is_client() and app.has_client_access(client_id))
  with check (not app.is_client() and app.has_client_access(client_id));

-- folders / assets / renditions / transcripts / segments: derive from project.
create policy folders_access on folders for all to authenticated
  using (app.has_project_access(project_id))
  with check (not app.is_client() and app.has_project_access(project_id));

create policy assets_select on assets for select to authenticated
  using (app.has_project_access(project_id));
create policy assets_write on assets for all to authenticated
  using (not app.is_client() and app.has_project_access(project_id))
  with check (not app.is_client() and app.has_project_access(project_id));

create policy renditions_select on renditions for select to authenticated
  using (app.has_project_access(app.asset_project(asset_id)));
create policy renditions_write on renditions for all to authenticated
  using (app.is_owner()) with check (app.is_owner());

create policy transcripts_select on transcripts for select to authenticated
  using (app.has_project_access(app.asset_project(asset_id)));
create policy transcripts_write on transcripts for all to authenticated
  using (app.is_owner()) with check (app.is_owner());

create policy segments_select on transcript_segments for select to authenticated
  using (exists (select 1 from transcripts t
                 where t.id = transcript_id
                   and app.has_project_access(app.asset_project(t.asset_id))));
create policy segments_write on transcript_segments for all to authenticated
  using (app.is_owner()) with check (app.is_owner());

-- share_links: managed by owner/collaborators; clients never read them directly
-- (public access goes through a server route + service role).
create policy share_links_manage on share_links for all to authenticated
  using (not app.is_client() and app.has_project_access(project_id))
  with check (not app.is_client() and app.has_project_access(project_id));

-- comments: visible with the asset; any member with project access may add.
create policy comments_select on comments for select to authenticated
  using (app.has_project_access(app.asset_project(asset_id)));
create policy comments_insert on comments for insert to authenticated
  with check (app.has_project_access(app.asset_project(asset_id)));
create policy comments_update_own on comments for update to authenticated
  using (author_id = auth.uid() or app.is_owner())
  with check (author_id = auth.uid() or app.is_owner());
create policy comments_delete on comments for delete to authenticated
  using (author_id = auth.uid() or app.is_owner());

-- favorites: visible/writable by members with project access.
create policy favorites_select on favorites for select to authenticated
  using (app.has_project_access(app.asset_project(asset_id)));
create policy favorites_write on favorites for all to authenticated
  using (app.has_project_access(app.asset_project(asset_id)))
  with check (app.has_project_access(app.asset_project(asset_id)));

-- audit_log: owner reads all; collaborators read their clients'. Writes happen
-- via the service role (server), so no authenticated insert policy is granted.
create policy audit_select on audit_log for select to authenticated
  using (app.is_owner() or (client_id is not null and not app.is_client()
                            and app.has_client_access(client_id)));

-- jobs: owner/collaborators read within their projects; worker writes via service role.
create policy jobs_select on jobs for select to authenticated
  using (not app.is_client() and app.has_project_access(app.asset_project(asset_id)));

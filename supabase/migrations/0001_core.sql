-- Poole Studio core schema
-- Single-tenant: any authenticated user is the admin (signups are disabled in auth settings).
-- The anon role gets NO table access; public share pages are served by server routes that
-- validate a share link first and use the service role.

create type project_kind as enum ('gallery', 'review', 'transfer', 'drive');

create table projects (
  id uuid primary key default gen_random_uuid(),
  kind project_kind not null,
  title text not null,
  slug text not null unique,
  description text,
  cover_asset_id uuid,
  settings jsonb not null default '{}'::jsonb,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table folders (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  parent_id uuid references folders(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table assets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  folder_id uuid references folders(id) on delete set null,
  filename text not null,
  storage_path text not null unique,
  mime text not null default 'application/octet-stream',
  size_bytes bigint not null default 0,
  width int,
  height int,
  duration_s numeric,
  version int not null default 1,
  -- newest upload of a review asset points at the original via version_of
  version_of uuid references assets(id) on delete cascade,
  position int not null default 0,
  created_at timestamptz not null default now()
);

alter table projects
  add constraint projects_cover_asset_fk
  foreign key (cover_asset_id) references assets(id) on delete set null;

create table share_links (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  slug text not null unique,
  label text,
  password_hash text,
  expires_at timestamptz,
  allow_downloads boolean not null default true,
  download_size text not null default 'original' check (download_size in ('original', 'web')),
  max_downloads int,
  download_count int not null default 0,
  view_count int not null default 0,
  allow_comments boolean not null default true,
  allow_favorites boolean not null default true,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create table comments (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references assets(id) on delete cascade,
  parent_id uuid references comments(id) on delete cascade,
  share_link_id uuid references share_links(id) on delete set null,
  author_name text not null default 'Client',
  is_admin boolean not null default false,
  body text not null,
  timecode_s numeric,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create table favorites (
  id uuid primary key default gen_random_uuid(),
  share_link_id uuid not null references share_links(id) on delete cascade,
  asset_id uuid not null references assets(id) on delete cascade,
  client_name text,
  created_at timestamptz not null default now(),
  unique (share_link_id, asset_id)
);

create table activity (
  id bigint generated always as identity primary key,
  project_id uuid not null references projects(id) on delete cascade,
  share_link_id uuid references share_links(id) on delete set null,
  event text not null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index assets_project_position_idx on assets (project_id, position);
create index assets_version_of_idx on assets (version_of);
create index folders_project_parent_idx on folders (project_id, parent_id);
create index comments_asset_created_idx on comments (asset_id, created_at);
create index share_links_project_idx on share_links (project_id);
create index favorites_link_idx on favorites (share_link_id);
create index activity_project_created_idx on activity (project_id, created_at desc);

create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end
$$;

create trigger projects_set_updated_at
  before update on projects
  for each row execute function set_updated_at();

-- RLS: admin (authenticated) full access, anon nothing.
alter table projects enable row level security;
alter table folders enable row level security;
alter table assets enable row level security;
alter table share_links enable row level security;
alter table comments enable row level security;
alter table favorites enable row level security;
alter table activity enable row level security;

create policy "admin full access" on projects    for all to authenticated using (true) with check (true);
create policy "admin full access" on folders     for all to authenticated using (true) with check (true);
create policy "admin full access" on assets      for all to authenticated using (true) with check (true);
create policy "admin full access" on share_links for all to authenticated using (true) with check (true);
create policy "admin full access" on comments    for all to authenticated using (true) with check (true);
create policy "admin full access" on favorites   for all to authenticated using (true) with check (true);
create policy "admin full access" on activity    for all to authenticated using (true) with check (true);

-- Storage: one private bucket for everything the admin uploads.
insert into storage.buckets (id, name, public)
values ('originals', 'originals', false)
on conflict (id) do nothing;

create policy "admin rw originals" on storage.objects
  for all to authenticated
  using (bucket_id = 'originals')
  with check (bucket_id = 'originals');

-- Atomic download counting that respects max_downloads.
create or replace function increment_download(link_id uuid) returns boolean
language plpgsql security definer as $$
declare ok boolean;
begin
  update share_links
     set download_count = download_count + 1
   where id = link_id
     and revoked_at is null
     and (max_downloads is null or download_count < max_downloads)
  returning true into ok;
  return coalesce(ok, false);
end
$$;

create or replace function increment_view(link_id uuid) returns void
language sql security definer as $$
  update share_links set view_count = view_count + 1 where id = link_id;
$$;

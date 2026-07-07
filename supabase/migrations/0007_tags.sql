-- ── Tags ──────────────────────────────────────────────────────────────────
-- Frame.io-style tagging. A single studio-wide vocabulary (the way a
-- photographer thinks: "selects", "retouch", "approved", "RAW") that any asset
-- can carry, plus the freedom to coin custom tags on the fly.
--
-- Tags themselves are just labels + colors — not sensitive — so any signed-in
-- member may read them; only non-clients (owner/collaborators) may create or
-- rename. The asset_tags join is gated by project access, exactly like every
-- other asset-scoped table, so a client can never see or set tags on work
-- that isn't theirs.

create table tags (
  id         uuid primary key default gen_random_uuid(),
  label      text not null,
  color      text not null default 'gray',   -- token name: gray|blue|green|amber|red|purple|pink
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Case-insensitive uniqueness so "Selects" and "selects" don't split.
create unique index tags_label_uniq on tags (lower(label));

create table asset_tags (
  asset_id   uuid not null references assets(id) on delete cascade,
  tag_id     uuid not null references tags(id) on delete cascade,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (asset_id, tag_id)
);

create index asset_tags_tag_idx on asset_tags (tag_id);

alter table tags       enable row level security;
alter table asset_tags enable row level security;

-- tags: everyone signed in can read the vocabulary; only non-clients manage it.
create policy tags_select on tags for select to authenticated
  using (true);
create policy tags_write on tags for all to authenticated
  using (not app.is_client())
  with check (not app.is_client());

-- asset_tags: readable with the asset; writable by members with project access.
create policy asset_tags_select on asset_tags for select to authenticated
  using (app.has_project_access(app.asset_project(asset_id)));
create policy asset_tags_write on asset_tags for all to authenticated
  using (not app.is_client() and app.has_project_access(app.asset_project(asset_id)))
  with check (not app.is_client() and app.has_project_access(app.asset_project(asset_id)));

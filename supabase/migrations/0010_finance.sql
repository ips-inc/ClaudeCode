-- ── Money: estimates, invoices, payments ───────────────────────────────────
-- The accountant surface. Estimates and invoices share one shape (a
-- finance_doc with line items); an approved estimate converts to an invoice.
-- Owner/collaborators manage; a client sees only their own non-draft docs and
-- can approve/decline an estimate. Zoho Books + payment-processor sync layer on
-- top of this later — the numbers and lifecycle are real now.

create type finance_kind   as enum ('estimate', 'invoice');
create type finance_status as enum ('draft', 'sent', 'viewed', 'approved', 'declined', 'paid', 'void');

create table finance_docs (
  id          uuid primary key default gen_random_uuid(),
  kind        finance_kind not null,
  number      text not null,
  client_id   uuid not null references clients(id) on delete cascade,
  project_id  uuid references projects(id) on delete set null,
  status      finance_status not null default 'draft',
  currency    text not null default 'USD',
  issue_date  date not null default current_date,
  due_date    date,
  notes       text,
  terms       text,
  subtotal    numeric(12,2) not null default 0,
  tax_rate    numeric(5,2)  not null default 0,
  tax         numeric(12,2) not null default 0,
  total       numeric(12,2) not null default 0,
  amount_paid numeric(12,2) not null default 0,
  created_by  uuid references profiles(id) on delete set null,
  sent_at     timestamptz,
  viewed_at   timestamptz,
  approved_at timestamptz,
  declined_at timestamptz,
  paid_at     timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index finance_docs_client_idx on finance_docs (client_id);

create table finance_line_items (
  id          uuid primary key default gen_random_uuid(),
  doc_id      uuid not null references finance_docs(id) on delete cascade,
  description text not null,
  qty         numeric(12,2) not null default 1,
  unit_price  numeric(12,2) not null default 0,
  amount      numeric(12,2) not null default 0,
  position    int not null default 0
);
create index finance_line_items_doc_idx on finance_line_items (doc_id);

create table finance_payments (
  id          uuid primary key default gen_random_uuid(),
  doc_id      uuid not null references finance_docs(id) on delete cascade,
  amount      numeric(12,2) not null,
  method      text not null default 'other',   -- card|ach|wire|zelle|check|other
  reference   text,
  note        text,
  received_at date not null default current_date,
  created_by  uuid references profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index finance_payments_doc_idx on finance_payments (doc_id);

create trigger finance_docs_touch before update on finance_docs
  for each row execute function app.touch_updated_at();

alter table finance_docs       enable row level security;
alter table finance_line_items enable row level security;
alter table finance_payments   enable row level security;

-- Docs: owner/collaborators manage their clients'; a client reads only their
-- own non-draft docs (drafts stay private until sent).
create policy finance_docs_manage on finance_docs for all to authenticated
  using (not app.is_client() and app.has_client_access(client_id))
  with check (not app.is_client() and app.has_client_access(client_id));
create policy finance_docs_client_read on finance_docs for select to authenticated
  using (app.is_client() and app.has_client_access(client_id) and status <> 'draft');

-- Line items follow their doc.
create policy finance_items_manage on finance_line_items for all to authenticated
  using (not app.is_client() and exists (
    select 1 from finance_docs d where d.id = doc_id and app.has_client_access(d.client_id)))
  with check (not app.is_client() and exists (
    select 1 from finance_docs d where d.id = doc_id and app.has_client_access(d.client_id)));
create policy finance_items_client_read on finance_line_items for select to authenticated
  using (app.is_client() and exists (
    select 1 from finance_docs d
     where d.id = doc_id and app.has_client_access(d.client_id) and d.status <> 'draft'));

-- Payments: owner/collaborators only.
create policy finance_payments_manage on finance_payments for all to authenticated
  using (not app.is_client() and exists (
    select 1 from finance_docs d where d.id = doc_id and app.has_client_access(d.client_id)))
  with check (not app.is_client() and exists (
    select 1 from finance_docs d where d.id = doc_id and app.has_client_access(d.client_id)));

-- Per-kind human-friendly numbering.
create sequence finance_estimate_seq;
create sequence finance_invoice_seq;

create or replace function public.finance_next_number(p_kind finance_kind)
returns text
language sql security definer set search_path = public as $$
  select case p_kind
    when 'estimate' then 'EST-' || lpad(nextval('finance_estimate_seq')::text, 4, '0')
    else                 'INV-' || lpad(nextval('finance_invoice_seq')::text,  4, '0')
  end
$$;
grant execute on function public.finance_next_number(finance_kind) to authenticated;

-- A client approves/declines one of their own sent estimates. SECURITY DEFINER
-- so the transition is controlled, but the caller's identity (auth.uid) still
-- gates access via has_client_access.
create or replace function public.finance_respond(p_doc uuid, p_approve boolean)
returns void
language plpgsql security definer set search_path = public, app as $$
begin
  update finance_docs set
    status      = case when p_approve then 'approved' else 'declined' end,
    approved_at = case when p_approve then now() else approved_at end,
    declined_at = case when p_approve then declined_at else now() end,
    updated_at  = now()
  where id = p_doc
    and kind = 'estimate'
    and status in ('sent', 'viewed')
    and app.is_client()
    and app.has_client_access(client_id);
end $$;
grant execute on function public.finance_respond(uuid, boolean) to authenticated;

-- Mark a sent doc viewed when the client opens it (first view only).
create or replace function public.finance_mark_viewed(p_doc uuid)
returns void
language plpgsql security definer set search_path = public, app as $$
begin
  update finance_docs set status = 'viewed', viewed_at = now()
  where id = p_doc and status = 'sent'
    and app.is_client() and app.has_client_access(client_id);
end $$;
grant execute on function public.finance_mark_viewed(uuid) to authenticated;

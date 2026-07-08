-- ── Security hardening (self-audit findings) ──────────────────────────────
-- 1. Comments: enforce authorship + admin-flag integrity at the RLS layer.
--    The old insert policy only checked project access, so a client could
--    insert comments as someone else (or flagged is_admin) via direct REST.
drop policy comments_insert on comments;
create policy comments_insert on comments for insert to authenticated
  with check (
    app.has_project_access(app.asset_project(asset_id))
    and author_id = auth.uid()
    and (not is_admin or app.is_owner())
  );
drop policy comments_update_own on comments;
create policy comments_update_own on comments for update to authenticated
  using (author_id = auth.uid() or app.is_owner())
  with check (
    (author_id = auth.uid() or app.is_owner())
    and (not is_admin or app.is_owner())
  );

-- 2. Finance is the OWNER's book, not collaborators'. Outside editors work in
--    projects; they must never read or write invoices/estimates/payments.
--    Clients keep their non-draft read + respond RPC.
drop policy finance_docs_manage on finance_docs;
create policy finance_docs_manage on finance_docs for all to authenticated
  using (app.is_owner()) with check (app.is_owner());
drop policy finance_items_manage on finance_line_items;
create policy finance_items_manage on finance_line_items for all to authenticated
  using (app.is_owner()) with check (app.is_owner());
drop policy finance_payments_manage on finance_payments;
create policy finance_payments_manage on finance_payments for all to authenticated
  using (app.is_owner()) with check (app.is_owner());

-- Numbering: no reason clients (or anon) can bump the sequences.
create or replace function public.finance_next_number(p_kind finance_kind)
returns text
language plpgsql security definer set search_path = public, app as $$
begin
  if auth.uid() is null or app.is_client() then
    raise exception 'forbidden';
  end if;
  return case p_kind
    when 'estimate' then 'EST-' || lpad(nextval('finance_estimate_seq')::text, 4, '0')
    else                 'INV-' || lpad(nextval('finance_invoice_seq')::text,  4, '0')
  end;
end $$;

-- 3. Media pipeline + audit no longer depend on the service-role key from the
--    web app (it was silently failing: jobs never enqueued, audit rows lost).
--    Same authenticated-RPC pattern that fixed share links.
create or replace function public.enqueue_media_jobs(p_asset uuid)
returns void
language plpgsql security definer set search_path = public, app as $$
begin
  if auth.uid() is null or app.is_client()
     or not app.has_project_access(app.asset_project(p_asset)) then
    return;
  end if;
  insert into jobs (asset_id, type) values (p_asset, 'transcode'), (p_asset, 'transcribe');
end $$;
grant execute on function public.enqueue_media_jobs(uuid) to authenticated;

create or replace function public.audit_event(
  p_action text, p_project uuid, p_object_type text, p_object_id uuid,
  p_ip text, p_ua text, p_meta jsonb)
returns void
language plpgsql security definer set search_path = public, app as $$
begin
  if auth.uid() is null then return; end if;
  if p_project is not null and not app.has_project_access(p_project) then return; end if;
  insert into audit_log (action, project_id, client_id, actor_id, object_type, object_id, ip, user_agent, meta)
  values (
    p_action, p_project,
    (select client_id from projects where id = p_project),
    auth.uid(), p_object_type, p_object_id,
    case when trim(split_part(coalesce(p_ip, ''), ',', 1)) ~ '^[0-9a-fA-F:.]+$'
         then trim(split_part(p_ip, ',', 1))::inet else null end,
    p_ua, coalesce(p_meta, '{}'::jsonb));
end $$;
grant execute on function public.audit_event(text, uuid, text, uuid, text, text, jsonb) to authenticated;

-- 4. Share passwords: pgcrypto's gen_salt('bf') defaults to cost 6, which is
--    weak for an unthrottled unlock RPC. Cost 10 matches the old bcryptjs hashes.
create or replace function public.share_hash_password(p_password text)
returns text
language sql security definer set search_path = public, extensions as $$
  select crypt(p_password, gen_salt('bf', 10))
$$;

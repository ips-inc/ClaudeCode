-- Atomic job claim for pipeline workers (FOR UPDATE SKIP LOCKED so any number
-- of workers can poll concurrently without double-claiming). Service role only.
create or replace function app.claim_job(kinds job_type[])
returns jobs
language plpgsql security definer set search_path = public, app as $$
declare j jobs;
begin
  select * into j
    from jobs
   where status = 'queued' and type = any(kinds)
   order by created_at
   for update skip locked
   limit 1;
  if j.id is null then
    return null;
  end if;
  update jobs
     set status = 'running', attempts = attempts + 1
   where id = j.id;
  j.status := 'running';
  j.attempts := j.attempts + 1;
  return j;
end $$;

revoke execute on function app.claim_job(job_type[]) from anon, authenticated, public;
grant  execute on function app.claim_job(job_type[]) to service_role;

-- Requeue jobs that died mid-run (worker crashed): stale running > 2h.
create or replace function app.requeue_stale_jobs()
returns int
language sql security definer set search_path = public, app as $$
  with moved as (
    update jobs
       set status = case when attempts >= 3 then 'error'::job_status else 'queued'::job_status end,
           error  = case when attempts >= 3 then coalesce(error, 'stale after 3 attempts') else error end
     where status = 'running' and updated_at < now() - interval '2 hours'
    returning 1
  )
  select count(*)::int from moved;
$$;

revoke execute on function app.requeue_stale_jobs() from anon, authenticated, public;
grant  execute on function app.requeue_stale_jobs() to service_role;

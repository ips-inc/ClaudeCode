-- The worker claims jobs over PostgREST, which only exposes the `public`
-- schema — app.claim_job was unreachable (every poll 406'd), so nothing ever
-- transcoded. Public wrappers, service-role only, delegating to the originals.
create or replace function public.claim_job(kinds job_type[])
returns jobs
language sql as $$
  select * from app.claim_job(kinds)
$$;
revoke execute on function public.claim_job(job_type[]) from anon, authenticated, public;
grant  execute on function public.claim_job(job_type[]) to service_role;

create or replace function public.requeue_stale_jobs()
returns int
language sql as $$
  select app.requeue_stale_jobs()
$$;
revoke execute on function public.requeue_stale_jobs() from anon, authenticated, public;
grant  execute on function public.requeue_stale_jobs() to service_role;

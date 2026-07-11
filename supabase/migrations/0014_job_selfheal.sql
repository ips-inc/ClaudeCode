-- Pipeline self-healing. requeue_stale_jobs() existed but nothing called it,
-- so a job orphaned by a crashed/redeployed worker would hang as 'running'
-- forever. pg_cron sweeps every 30 minutes inside the database — works even
-- when no worker or web server is alive.
create extension if not exists pg_cron;

select cron.schedule(
  'requeue-stale-jobs',
  '*/30 * * * *',
  $$select public.requeue_stale_jobs()$$
);

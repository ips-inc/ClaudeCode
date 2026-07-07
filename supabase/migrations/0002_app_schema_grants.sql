-- RLS policies call app.* helper functions, so the PostgREST roles must be able
-- to reach the `app` schema and execute those functions. Without this, every
-- policy check errors with "permission denied for schema app".
grant usage on schema app to anon, authenticated, service_role;
grant execute on all functions in schema app to anon, authenticated, service_role;
alter default privileges in schema app
  grant execute on functions to anon, authenticated, service_role;

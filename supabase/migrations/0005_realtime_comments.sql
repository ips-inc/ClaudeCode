-- Live comment sync: publish comments to Supabase Realtime. Events are
-- delivered per-user through RLS, so only project members receive them.
alter publication supabase_realtime add table comments;
-- Full row images so UPDATE events (resolve/edit) carry complete records.
alter table comments replica identity full;

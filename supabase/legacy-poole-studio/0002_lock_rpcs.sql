-- Only the service role (server) may bump share-link counters; the public
-- anon key must not be able to inflate or exhaust download counts.
revoke execute on function increment_download(uuid) from anon, authenticated, public;
revoke execute on function increment_view(uuid) from anon, authenticated, public;

-- Zoho Books sync bookkeeping. Additive + nullable: the columns sit empty until
-- Zoho credentials are added to the app env, at which point finance docs sync
-- and store their Zoho ids here. A Zoho contact id is cached per client so we
-- don't create duplicate contacts.
alter table finance_docs add column if not exists zoho_id text;
alter table finance_docs add column if not exists zoho_synced_at timestamptz;
alter table clients      add column if not exists zoho_contact_id text;

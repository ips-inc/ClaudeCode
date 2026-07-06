# Running notes — decisions & lessons

Short, append-only log across sessions. Newest first.

## 2026-07-06

- **Goal pivoted** from "four-tool clone (Poole Studio)" to a secure, multi-tenant **Studio Media
  Cloud** MVP (roles, transcode pipeline, self-hosted Whisper, frame-accurate realtime comments,
  audit log, hard client isolation). Plan-first: see `docs/MVP_PLAN.md`.
- **Decisions:** evolve existing app · dedicated DB project · branded media delivery · workers =
  containerized CPU worker on Railway (owner deploys).
- **Blocker:** Supabase org is on **free** plan, 2/2 project slots used (`kris`, `billing`).
  Dedicated project needs either an org Pro upgrade (dashboard, owner-only) or pausing a free
  project. Awaiting owner choice before M1.
- **Sandbox limits:** no ffmpeg, no GPU (4 CPU / 15 GB, Docker present). Worker code is built+tested
  here; transcode/transcription runs on the owner's Railway.
- **Existing build (Poole Studio):** live schema is additive tables inside the `billing` project
  with email-scoped RLS. When the dedicated project exists, migrate the reused pieces there.
- **Lesson:** the Supabase MCP has no org-plan-upgrade tool; Pro upgrade is a dashboard action the
  owner must take. Don't assume tooling can change billing tier.
- **New requirement:** any file type / any size / any quality + a **10–30 TB archive**. Decided media
  store = **Cloudflare R2** (S3-compatible, ~$0.015/GB-mo, **$0 egress**, no per-file cap, branded
  `media.<domain>` origin). Supabase Storage rejected for media (egress $0.09/GB kills it at scale).
  Supabase now = Postgres/Auth/Realtime/RLS only. Cold-tier to B2/Glacier later via lifecycle rule.
- **Consequence:** with media on R2, the Supabase Pro upgrade is about a clean dedicated project, not
  storage limits. Owner chose to upgrade org to Pro; on completion → create dedicated project → M1.
- Owner upgraded org to **Pro**. Created dedicated project **studio-media-cloud**
  (ref `lnclobwmfkxtibqnxgip`, us-east-1). Media cloud lives here; legacy Poole Studio SQL moved to
  `supabase/legacy-poole-studio/`.

### M1 — Multi-tenant security spine ✅ (2026-07-06)

- Schema `supabase/migrations/0001_security_spine.sql`: profiles/clients/memberships + content,
  media, transcript, share, audit, jobs tables. RLS on **every** table (default deny), driven by
  `app.*` SECURITY DEFINER helpers (is_owner / has_client_access / has_project_access). anon = no
  rows. Client-role users only see `published` projects.
- `0002_app_schema_grants.sql`: grant usage/execute on schema `app` to anon/authenticated (without
  it, every policy check errors "permission denied for schema app").
- **Bugs caught by the test, fixed:** (1) new-user trigger returned text where `user_role` enum
  expected — cast added, else all signups would fail; (2) `touch_updated_at` mutable search_path —
  pinned.
- **Isolation test** `supabase/tests/isolation.sql`: 13/13 assertions pass — A/B fully isolated,
  drafts hidden from clients, outsider + anon see nothing, owner sees all. Security advisor: **0 lints.**
- Env now points at the dedicated project. Still need at M2: R2 (or MinIO) S3 credentials +
  `SUPABASE_SERVICE_ROLE_KEY` (dashboard, owner-only).
### M2 — Storage & share hardening (in progress, 2026-07-06)

Verified offline (no live infra needed):
- `src/lib/s3.ts` — S3-compatible client (R2 / MinIO / S3) with presigned GET/PUT + resumable
  multipart. Presign correctness proven in `tests/s3-presign.test.ts` (bucket/key/host, SigV4
  signature, TTL, forced attachment disposition, filename sanitization) — 4/4.
- `src/lib/filetype.ts` — magic-byte sniffing; never trusts client Content-Type; neutralizes
  dangerous inline types. `tests/filetype.test.ts` — 5/5.
- `0003_share_functions.sql` — atomic service-role-only download/view gates (revoke/expiry/limit).
  `supabase/tests/share_links.sql` — 9/9.

Run all TS tests: `npm test`.

**Sandbox limits hit:** Docker registry is blocked by egress policy (can't run local MinIO), and
there's no ffmpeg here. So the remaining M2 pieces — the IDOR-proof `/api/media` access route, the
multipart upload routes, and audit writes — are buildable and typecheck-clean, but their end-to-end
byte round-trip can only be RUNTIME-verified against a real bucket. To close that I need (owner):
1. `SUPABASE_SERVICE_ROLE_KEY` for studio-media-cloud (dashboard → Project Settings → API keys).
2. Storage backend choice + creds: Cloudflare R2 (recommended) or self-hosted MinIO — S3 endpoint,
   bucket, access key/secret. Either is a drop-in via the S3_* env vars.
Until then the authz decisions themselves ARE already verified (RLS isolation + share gating tests).

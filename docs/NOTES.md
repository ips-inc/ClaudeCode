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

**M2 complete (2026-07-06).** Remaining pieces built AND runtime-verified:
- `/api/upload/{start,part,complete}` — resumable multipart (any size), write-access verified on
  every call, real type re-sniffed from object bytes at completion, jobs auto-queued for AV media.
- `/api/media/[assetId]` — the single authenticated door to bytes: explicit authz per request, no
  existence oracle (foreign ID and missing ID both 404), renditions via `?r=`, audited downloads.
- **Byte round-trip proven** via `tests/s3-roundtrip.test.ts` against moto (local S3 on :5001 —
  same S3 API as prod): PUT→GET bytes equal, multipart assembles in order, attachment disposition
  honored. SigV4-tamper rejection auto-skips on moto (doesn't validate signatures) and asserts on
  R2/MinIO. Suite: `npm test` → 12 pass, 1 honest skip.
- Full E2E through the Next routes still happens at deploy: sandbox egress blocks `*.supabase.co`
  (403 policy, do-not-retry), so the app can't reach the live DB from here. Owner's
  `SUPABASE_SERVICE_ROLE_KEY` is in `.env.local` (gitignored). ⚠ Key was pasted in chat once —
  rotate at deploy.
- Sandbox: Docker registry blocked (no MinIO container; dockerd itself runs) → moto instead.

**Env facts (this sandbox):** pypi.org allowlisted (pip works) · registry.npmjs.org allowlisted ·
`*.supabase.co`, huggingface.co and Docker Hub blocked by egress policy · no system ffmpeg (static
binary available via `pip install imageio-ffmpeg`) · python3.11 present.

## 2026-07-06 (later) — M3 + M4

- **Worker built (`worker/`):** Python package + Dockerfile (python:3.11-slim + apt ffmpeg +
  faster-whisper). Atomic job claim via `app.claim_job` (SKIP LOCKED, service-role only; applied to
  live DB with `requeue_stale_jobs` for crash recovery). Renditions: proxy 540p (faststart + dense
  keyframes for scrubbing), 720p, 1080p (never upscales), poster, thumb; audio-only → AAC proxy.
  Transcription: faster-whisper, word timestamps, VAD, SRT/VTT sidecars, segments batched to DB.
- **Verified with REAL ffmpeg** (imageio-ffmpeg static binary): worker tests 6/6 — probe, full
  ladder, no-upscale rule, faststart moov present, 16kHz ASR extraction. Whisper *model inference*
  not runnable here (huggingface.co blocked) — verify on deployed worker; faster-whisper imports OK.
- **App-side transcript routes:** `/api/assets/[id]/transcript` (JSON segments / `?format=srt|vtt`
  sidecar redirect) and `/api/projects/[id]/transcript-search` (websearch FTS over segments with
  timecodes). Both behind explicit authz, no existence oracle.
## 2026-07-06 (later) — M5 realtime frame-accurate review

- **Comment schema already had `frame`+`fps`+`author_id`** with full RLS (select/insert/update/
  delete policies). Enabled realtime: `alter publication supabase_realtime add table comments` +
  `replica identity full` (migration 0005, applied live — verified: publication now lists comments,
  replica identity = f).
- **Comment API:** `POST/GET /api/assets/[id]/comments` (frame-pinned create, authorized, audited),
  `PATCH/DELETE /api/comments/[id]` (resolve = owner/collaborator; delete = author or owner).
- **`src/lib/frames.ts`** — frame-accurate math. Key fix: `frameToTime` nudges +0.25 frame (not
  +0.5, which lands on the round() boundary and bumps to the next frame). Round-trips for
  23.976/24/25/29.97/30/60 fps. **6/6 unit tests green.**
- **`FrameReview.tsx`** — proxy player, ◄►frame-step, SMPTE readout, timeline markers, live comment
  sync via Supabase Realtime channel (RLS-filtered so only members get events), optimistic echo
  deduped by id, resolve/reply threads.
- **Verified:** frame math (unit), realtime publication + replica identity (live SQL), routes
  (typecheck + build register all three). Two-browser live delivery needs the deployed app.

- **Next:** M6 client delivery gallery + audit-log surfacing, then deploy checklist
  (Vercel + Railway + R2/MinIO + key rotation).

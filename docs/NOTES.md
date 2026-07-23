# Running notes — decisions & lessons

Short, append-only log across sessions. Newest first.

## 2026-07-23 — Apollo.io MCP wired as a build-time tool

- Added `.mcp.json` registering Apollo's hosted MCP server (`https://mcp.apollo.io/mcp`,
  streamable-HTTP) with `X-Api-Key: ${APOLLO_API_KEY}` header expansion, so the secret stays
  out of git. Same posture as the Zoho Books MCP: **build-time tool only** — the deployed app
  does not read `APOLLO_API_KEY`. New env placeholder in `.env.example`; setup in
  `docs/APOLLO-MCP.md`. Approve the project-scoped server once via `/mcp` on first load.

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

## 2026-07-06 (later) — M6 client delivery + audit, and the REAL isolation tests

- **Client delivery (authenticated multi-tenant path — the acceptance-criteria path):**
  `/deliver` (projects visible to the actor) + `/deliver/[projectId]` (gallery). Thumbnails and
  downloads both flow through `/api/media` → authz re-checked per request + every download audited.
  Owners see the per-project **access log (proof of delivery)** inline; clients never do.
  `GET /api/projects/[id]/audit` (owner/collab only) + `src/lib/deliveries.ts` (isolation in the
  data layer as defense-in-depth on top of RLS).
- **Correction to the M1 record:** M1 was checkpointed "isolation green" from interactive checks,
  but no re-runnable test was committed. Fixed now — two deterministic SQL suites, **run live and
  green**, that create fixtures → assert → roll back via sentinel (no residue):
  - `supabase/tests/isolation_test.sql` — **13/13**: client A sees only its own PUBLISHED project
    (draft hidden; client B's project AND asset both denied by id = IDOR-proof); client is
    read-only (insert denied); client B symmetric; anon sees 0 projects/assets/clients; owner sees
    all.
  - `supabase/tests/share_link_test.sql` — **8/8**: valid link consumes download + view; revoked,
    expired, downloads-disabled, and at-cap links all denied for both download and view.
  - `supabase/tests/run.sh` runs both via `DATABASE_URL` (psql) for CI/local. (Sandbox shell can't
    reach supabase — these were executed live through the Supabase SQL tool.)
- **Legacy note:** `/studio/**` and `/s/[slug]/**` are the superseded single-tenant Poole-Studio
  pages; they compile but reference old columns (storage_path) and are NOT the media-cloud delivery
  path. Reconcile-or-remove in a later cleanup; the canonical delivery is `/deliver/**`.
- **Status: all six milestones code-complete and verified to the extent the sandbox allows.**
  Remaining before real use = deploy: Vercel (app) + Railway (worker) + R2/MinIO creds + rotate the
  service key that was pasted in chat + create client users. See docs/DEPLOY.md.

## 2026-07-06 (later) — "finish the build": owner studio + public share on new schema

The legacy `/studio` and `/s` pages were single-tenant Poole-Studio leftovers (referenced dropped
columns). Replaced with the multi-tenant surface so the whole system operates end to end:
- **Owner studio (new schema):** `/studio` (clients + projects + add-client), `/studio/new`
  (client+kind+title), `/studio/p/[id]` (publish toggle, uploader, asset grid, share-link
  create/revoke), `/studio/p/[id]/a/[assetId]` (wires the video into `FrameReview` with proxy +
  poster + VTT captions). New owner-guarded server actions in `studio/actions.ts`.
- **MultipartUploader** — drives `/api/upload/{start,part,complete}` (R2 multipart, 64MiB chunks,
  per-part retry, 2-wide concurrency). Replaces the old TUS→Supabase-Storage uploader.
- **Public share on new schema:** rewrote `src/lib/share.ts` (resolve + password cookie + audit),
  `/s/[slug]` (locked/expired/ok states, counted view), `components/share/ShareView.tsx` (gallery +
  lightbox), `/api/share/[slug]/file/[assetId]` (rendition/inline/download, `share_consume_download`
  enforces cap+allow, audited). Deleted the old zip/view routes + old share views + preview mocks +
  dead components.
- **Verified:** clean `next build` (12 routes), app tests 18 pass / 1 skip, and a live end-to-end
  SQL check of the exact share embed + view + download-consume path (rolled back). The two security
  suites (isolation 13/13, share 8/8) still pass.
- **Build is functionally complete.** Only deploy wiring remains (docs/DEPLOY.md).

## 2026-07-06 (later) — "finish the build" round 2: operational readiness

Closed the two things between "code-complete" and "actually usable":
- **Owner bootstrap (was a lockout risk):** the app 404s anyone without a `profiles` row. Added
  migration `0006_profile_bootstrap.sql` — a `handle_new_user` trigger that creates a profile on
  signup and makes the **first** account the owner (everyone after = client), plus a backfill for
  existing users. **Applied live and verified** (rolled back): with no owner, user 1 → owner,
  user 2 → client. Confirms the live project has no owner yet, so Isaac becomes owner automatically
  on first sign-in — zero manual SQL. DEPLOY.md step 4 simplified accordingly.
- **Worker full-loop E2E (biggest previously-unproven integration):** `worker/tests/test_pipeline_e2e.py`
  uploads a real source video to moto S3, stubs only the PostgREST layer, and runs the actual
  `main.run_one()` → claim → download → ffmpeg ladder → upload all 5 renditions back (verified via
  head_object) → record metadata → finish. **Ran green** with real ffmpeg. (Skips gracefully when
  no S3 test server.)
- **Fixed a real test-isolation bug:** `config.py` validated Supabase/S3 env at *import*, so pure
  ffmpeg/text tests couldn't import without DB creds. Now reads lazily; `config.validate()` fails
  fast in `main()` instead. Worker media/subtitles: 6/6 without any DB env.
- Sandbox quirk: backgrounding moto sometimes kills the shell (signal 16) and Postgres won't run
  here — doesn't affect the code; the e2e proof stands from a clean run.

## 2026-07-06 (later) — "finish the build" round 3: folders + CI

- **Drive folders (was half-wired):** schema + uploader already carried `folder_id`, but no UI
  created or navigated folders, so `drive` projects were flat. Wired it end to end:
  - `createFolder`/`deleteFolder` server actions (delete purges the whole subtree's storage keys).
  - `lib/deliveries.ts`: `projectFolders()` + folder-scoped `projectAssetsWithThumbs(id, folderId)`
    (undefined = all, null = root, uuid = that folder).
  - Studio project detail: breadcrumb + subfolder chips + create-folder + upload-into-current-folder
    for `drive` kind (other kinds stay flat).
  - Public share `/s/[slug]` + `ShareView`: folder breadcrumb + subfolder navigation for `drive`.
  - **Verified live:** folder scoping returns root=1 / folder=1 / all=2 (rolled back).
- **CI (`.github/workflows/ci.yml`):** two jobs — web (npm ci → typecheck → build → tests, moto for
  S3 tests) and worker (apt ffmpeg → pip deps → unittest, moto for S3). Runs the exact checks used
  by hand so the build stays green on every push. (Security SQL suites run via
  `supabase/tests/run.sh` against a real project — they need the Supabase stack, so out of CI.)
- All four project kinds now fully functional: gallery, review, transfer, drive.

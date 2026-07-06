# Studio Media Cloud — MVP Plan

Secure, self-hosted platform combining file storage, video review, and client delivery.
Replaces Dropbox + Frame.io + Pixieset. Solo operator today, scaling to collaborators + clients.
Core requirement: **hard isolation between clients, enforced at every layer.**

Status: **PLAN — awaiting go-ahead to start Milestone 1.** No feature code written for this plan yet.

## Confirmed decisions (2026-07-06)

1. **Foundation:** evolve the existing app ("Poole Studio"). Keep upload pipeline, share-link
   system, gallery/review UI, and branding; rebuild the security spine and add the media +
   transcription pipeline on top.
2. **Database:** dedicated Supabase project (not co-tenanted). Blocked on a free slot — see
   "Open decision" below.
3. **Workers:** recommendation below (owner asked to be advised).
4. **Media origin:** branded delivery. Private object store + short-lived presigned URLs, served
   under the owner's own domain (`media.<domain>`). Branding of the delivery *experience* is
   already on-brand and continues in the UI phase.
5. **Storage split (added 2026-07-06):** support **any file type, any size, any quality**, plus a
   **10–30 TB archive**. Media does NOT live in Supabase Storage (egress $0.09/GB makes it
   non-viable at scale). See "Storage architecture" below.

## Storage architecture

- **Supabase** = Postgres + Auth + Realtime + RLS only (metadata + security brain). No large media.
- **Cloudflare R2** = primary media store (originals + renditions + proxies). S3-compatible; ~$0.015/GB/mo
  and **$0 egress** — decisive when shipping multi-GB masters. Custom domain `media.<domain>` behind
  Cloudflare CDN doubles as the branded, isolated media origin; presigned URLs keep it private.
- **Any size:** direct **multipart resumable uploads** to R2 (100GB+ ProRes/R3D/ARRIRAW resume fine).
  R2 has no practical per-file cap (Supabase Storage does, even on Pro).
- **Any type:** originals stored untouched and downloadable at full quality; proxies generated only
  for video/audio/image; non-media stored/delivered as-is. Magic-byte sniff for safety, all types allowed.
- **Cost at scale (storage/mo):** R2 ~$154 / $307 / $460 for 10/20/30 TB, $0 egress. Cheaper cold
  tiers later via lifecycle rule → Backblaze B2 (~$6/TB) or S3 Glacier Deep Archive (~$1/TB), no app change.
- Reused pieces currently on Supabase Storage (Poole Studio) migrate to R2 as part of M2.

## What already exists and is reused

Auth (single admin), resumable TUS uploads, share links (high-entropy tokens, expiry, password,
revoke, download toggle), gallery + lightbox, timecoded review comments, activity log, brand
system. Roughly 40% of this spec. The new work is the security spine + media/transcription pipeline.

## Worker infrastructure — recommendation (owner asked to advise)

**Recommended: one containerized CPU worker on Railway, deployed by the owner.**

- A single Docker image: Node/Python worker + FFmpeg + faster-whisper (int8, `small` or `base`
  model). Pulls jobs from a `jobs` table, streams the original from private storage via a signed
  URL, produces renditions + proxy + poster + transcript, writes rows, marks done. Idempotent and
  retryable.
- **CPU is fine for the MVP.** faster-whisper `small` int8 transcribes roughly at or faster than
  real-time on a few CPU cores; transcode is CPU-bound but fine for a solo operator's volume. No
  per-minute fees, audio never leaves the infra. GPU is a later optimization if turnaround hurts.
- Model is swappable via one env var, so fine-tuning or upgrading later touches nothing else.
- **This sandbox can't run it** (no ffmpeg/GPU here) — I build and unit-test the worker + Docker
  image here; the owner deploys to their Railway with their credentials. "Deploy" and spend stay
  owner-triggered.

Alternative if turnaround matters from day one: same image on a Railway GPU instance. Higher cost;
defer unless needed.

## Data model (evolves the existing schema)

New / changed tables (RLS on every one, keyed off `memberships`):

- `profiles` — user + global role (owner / collaborator / client)
- `clients` — the isolation boundary (a brand/customer)
- `memberships` — user ↔ client ↔ role; the spine every RLS policy checks
- `projects` — add `client_id`, `owner_id`
- `assets` — source uploads (exists)
- `renditions` — asset_id, kind (proxy | 1080p | 720p | poster | thumb), storage_path, w/h/bitrate, status
- `transcripts` — asset_id, language, status, full_text (tsvector), vtt_path, srt_path
- `transcript_segments` — transcript_id, start_s, end_s, text, words jsonb (word-level ts)
- `comments` — add `frame` + `fps` for frame accuracy; realtime via Supabase Realtime
- `share_links` — exists; add explicit asset/gallery scope
- `audit_log` — actor, action, object_type, object_id, ip, ua, share_link_id, at (supersedes `activity`; proof-of-delivery)
- `jobs` — transcode/transcribe queue: type, asset_id, status, attempts, error

## Milestones (each ends with green tests before the next starts)

- **M1 — Multi-tenant security spine.** profiles/clients/memberships + RLS rewritten on every
  table. Isolation tests green: client A cannot read or GET client B's rows/files; a request with
  no/foreign creds returns zero rows. *(First, because isolation is the headline requirement.)*
- **M2 — Storage & share hardening.** Stand up **Cloudflare R2** as the media store (multipart
  resumable uploads; migrate existing Supabase-Storage objects over). Every object fetch goes
  through a server route that runs an authz check then mints a short-lived **presigned R2 URL** (no
  reliance on unguessable IDs — IDOR-proof). Server-side magic-byte file-type validation, upload
  scan hook. Audit log written on access/download. Share-link tests: valid works, revoked returns
  nothing, expired returns nothing, wrong password denied.
- **M3 — Video pipeline.** Worker skeleton + FFmpeg. Transcode to 1080p/720p + a scrubbing proxy +
  poster. Player selects the proxy for smooth scrubbing; downloads offered per rendition + original.
- **M4 — Transcription.** faster-whisper in the worker. Searchable segments, word timestamps,
  SRT/VTT export. Transcript search returns correct timecodes.
- **M5 — Realtime frame-accurate review.** Comments pinned to exact frame; Supabase Realtime syncs
  across viewers live.
- **M6 — Client delivery + audit surfacing.** Branded gallery delivery, per-file download controls,
  visible access/delivery log. Full acceptance pass against the brief's criteria. UI polish after.

## Acceptance criteria (verified with real tests, not assertions)

- Client account sees ONLY its own deliveries; foreign file ID is denied — **test**.
- Share link works while valid, returns nothing after revoke/expiry — **test both**.
- Large video scrubs smoothly (proxy) and downloads in each resolution.
- Transcript generated, searchable, exportable as SRT.
- Collaborator comment lands on the correct frame and appears for others in realtime.
- RLS on every table; no/foreign creds → no rows — **test**.

## Open decision blocking M1 (owner only)

Dedicated database needs a free project slot; the org is on the **free** plan with both slots used
(`kris`, `billing`). Two ways to get a dedicated project — I can't do the billing upgrade via
tooling, so pick one:

- **A) Upgrade the org to Pro** (~$25/mo) in the Supabase dashboard, then I create a dedicated
  project immediately. Cleanest; also raises per-file storage/upload limits needed for real video.
- **B) Pause a free project** to open a slot, then I create a dedicated **free** project now. No
  cost, but pausing takes that project offline until restored — needs explicit say-so on which one,
  since both are live and in use.

## Out of scope (per brief) — noted, not built

OS-mounted desktop sync engine; forensic per-viewer watermarking; AI visual search; auto-culling;
native mobile apps. Client-side E2E encryption intentionally excluded (breaks transcription/preview/
search) — rely on server-side encryption + tight access control.

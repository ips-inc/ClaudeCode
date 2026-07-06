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
- **Status: blocked on owner's Supabase Pro upgrade before creating the dedicated project + M1.**
  Will also need R2 credentials (account id, access key/secret, bucket) at M2.

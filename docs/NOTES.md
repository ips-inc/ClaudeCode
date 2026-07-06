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

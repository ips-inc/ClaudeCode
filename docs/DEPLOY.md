# Deploy checklist — Studio Media Cloud

Everything below is owner-driven (credentials + spend). The code, schema, and worker are done and
tested; this is wiring them to live infrastructure.

## 0. Rotate the service key (do this first)

The `service_role` key was pasted into chat during the build. Rotate it before going live:
Supabase dashboard → project `studio-media-cloud` → Project Settings → API keys → roll `service_role`.
Use the new value everywhere below. Never commit it; never expose it to the browser.

## 1. Storage — Cloudflare R2 (or self-hosted MinIO)

1. Create a bucket `studio-media` (private — no public access).
2. Create an S3 API token (Access Key ID + Secret).
3. (Branded delivery) map a custom domain `media.<yourdomain>` to the bucket via Cloudflare, and set
   `MEDIA_PUBLIC_BASE_URL=https://media.<yourdomain>`.
4. CORS on the bucket: allow `PUT` (multipart upload) and `GET` from your app origin.

MinIO instead? Same env vars — point `S3_ENDPOINT` at your MinIO URL. See the storage decision in
`docs/MVP_PLAN.md`.

## 2. App — Vercel

1. Import the repo. Framework: Next.js (auto).
2. Env vars:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://lnclobwmfkxtibqnxgip.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<publishable/anon key>
   SUPABASE_SERVICE_ROLE_KEY=<rotated secret>
   NEXT_PUBLIC_SITE_URL=https://<your-app-domain>
   S3_ENDPOINT=<r2 or minio endpoint>
   S3_REGION=auto
   S3_BUCKET=studio-media
   S3_ACCESS_KEY_ID=<...>
   S3_SECRET_ACCESS_KEY=<...>
   MEDIA_PUBLIC_BASE_URL=https://media.<yourdomain>
   ```
3. Deploy. Add your custom app domain.

## 3. Worker — Railway

1. New service from the same repo, root directory `worker/` (Dockerfile auto-detected).
2. Same `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `S3_*` vars, plus `WHISPER_MODEL=small`,
   `WHISPER_COMPUTE=int8`.
3. Attach a small volume at `/root/.cache/huggingface` so the Whisper model downloads once.
4. Deploy. Logs should print `[worker] up …` and then process `transcode`/`transcribe` jobs.

## 4. Auth + users

1. **Sign in first — you become the owner automatically.** The `handle_new_user` trigger creates a
   `profiles` row on signup and makes the **first** account the owner (every later signup is a
   client). So just sign in once at `/studio/login` with `isaac@isaacpoole.co` and you're the owner.
   No SQL needed. (To promote someone later: `update profiles set global_role=... where email=...`.)
2. Supabase → Authentication → Providers: after your first sign-in, turn OFF public signups so it's
   invite-only.
3. Add a client from `/studio` ("Add a client"). To give a client portal access: invite their email
   (Auth → Users → Invite) — they auto-get a client profile — then add a `memberships` row
   (their user_id ↔ client_id, role `client`). Or just send them a public `/s/…` share link, which
   needs no account at all.

## 5. Verify against acceptance criteria

- `DATABASE_URL=<pooler conn string> ./supabase/tests/run.sh` → both suites PASS.
- Upload a video in the studio → worker produces proxy/720p/1080p/poster + a transcript; the proxy
  scrubs smoothly; each resolution downloads.
- Open a delivery as a client account → sees only that client's published projects; a foreign asset
  id returns 404. Downloads appear in the project access log.
- Create a share link → works; revoke it → returns nothing.

## Costs (recap)

Supabase Pro $25/mo (org) + $10/mo (this project's compute) · R2 ~$0.015/GB + $0 egress ·
Railway from ~$5/mo. See `docs/MVP_PLAN.md` for the storage-at-scale math.

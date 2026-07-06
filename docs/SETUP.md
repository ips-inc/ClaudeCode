# Setup & Deploy

## What is already provisioned

The backend lives in the existing Supabase project **`billing`**
(`luyuccnfncfqhbscvdxq`, us-east-1) because the org's free tier is at its
2-active-project limit and both active projects are in use. This is safe:

- All Poole Studio tables were **added** (nothing existing was touched), with zero
  name collisions, via migration `poole_studio_core` (a copy is in
  `supabase/migrations/0001_core.sql`).
- Row Level Security restricts every studio table **to the account
  `isaac@isaacpoole.co` specifically** — other users, and the anon key, get nothing.
- A private storage bucket `originals` was created for all uploads.
- Your auth user `isaac@isaacpoole.co` already existed in this project, so your
  studio login is that account.

**Moving to a dedicated project later** (recommended if you upgrade the org): create a new
Supabase project, run `supabase/migrations/0001_core.sql` against it, create your user in
Auth → Users, and update the three env vars. Files would need a one-time copy between buckets.

## The one manual step: service-role key

The server needs the project's `service_role` secret (the MCP tooling that built this
intentionally can't read secrets). Grab it from:

**Supabase dashboard → project `billing` → Project Settings → API keys → `service_role`**

and paste it into `.env.local` (and your host's env settings when deploying):

```
NEXT_PUBLIC_SUPABASE_URL=https://luyuccnfncfqhbscvdxq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx1eXVjY25mbmNmcWhic2N2ZHhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMwMzg5NTQsImV4cCI6MjA5ODYxNDk1NH0.R3W4mgRBcNXDVn5yOxS3IRL1PyhV1NeL9X4BC7vW6_s
SUPABASE_SERVICE_ROLE_KEY=<paste here>
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

(The anon key above is a publishable key — safe to have in the browser; RLS does the guarding.)

## Recommended dashboard settings (5 minutes)

1. **Password**: if you don't know the password for `isaac@isaacpoole.co` in this project,
   reset it: Authentication → Users → your user → ⋯ → Send password recovery (or set one directly).
2. **Disable signups**: Authentication → Sign In / Providers → turn off "Allow new users to sign up".
   RLS already blocks strangers, but this closes the door entirely.
3. **Upload size**: Project Settings → Storage → Global file size limit. The free tier caps
   individual files at **50 MB** — fine for photos, too small for long video. The Pro plan
   ($25/mo) raises this to 50 GB per file and is the main cost of genuinely replacing
   Frame.io/WeTransfer for big video. The app already uploads resumably either way.

## Deploy (Vercel is the easy path)

1. Push this repo to GitHub (done) and import it in Vercel.
2. Set the four env vars above; set `NEXT_PUBLIC_SITE_URL` to your production URL —
   this is what share links are printed as (e.g. `https://delivery.isaacpoole.co`).
3. Add a custom domain like `delivery.isaacpoole.co` or `studio.isaacpoole.co`.

Any Node host works (`npm run build && npm start`) — Fly.io, Railway, a VPS. Long zip
downloads of huge transfers prefer a non-serverless host; on Vercel the zip route declares
`maxDuration: 300`.

## Costs vs. what it replaces

| | Now (free tier) | With Supabase Pro |
|---|---|---|
| Storage | 1 GB | 100 GB included, then ~$0.021/GB |
| Max file size | 50 MB | up to 50 GB |
| Replaces | Pixieset Free+, basic transfers | Pixieset (~$20/mo) + Frame.io (~$15/mo) + WeTransfer Pro (~$12/mo) + Dropbox (~$12/mo) |

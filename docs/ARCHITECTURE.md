# Poole Studio — Self-hosted Client File Delivery

A single-admin platform for Isaac Poole (NYC editorial & commercial photographer) that replaces
four paid services with one on-brand system:

| Replaces | What we take from it | Module |
|---|---|---|
| **Pixieset** | Client photo galleries: cover page, grid + lightbox, client favorites/proofing, download originals or web-size, gallery passwords | `gallery` |
| **Frame.io** | Video/image review: player with frame-accurate timecoded comments, threads, resolve, per-asset discussion | `review` |
| **WeTransfer** | Send big files fast: multi-file link, expiry date, download tracking, zip-all download | `transfer` |
| **Dropbox** | Personal cloud drive: folders, upload anything, rename/move/delete, share any file with a link | `drive` |

## Research notes (feature selection)

**Pixieset** — the parts photographers actually use: a beautiful public gallery URL to hand a
client, password protection, favoriting so the client can mark selects, and a download switch
(originals vs. web-size, on/off per link). Skipped: print store/e-commerce.

**Frame.io** — the core loop is: upload a cut → send a link → client leaves comments pinned to a
timecode → you resolve them → upload v2. Timecoded comments + resolve + versions covers ~90% of
solo-shooter usage. Skipped: multi-team workspaces, C2C camera uploads, transcoding ladders
(we play the uploaded file directly; H.264/HEVC MP4s play natively in browsers).

**WeTransfer** — a transfer is just an immutable bundle of files behind a pretty link with an
expiry and download counter. We add optional password + download limits (WeTransfer Pro features).

**Dropbox** — for one person, the valuable subset is: hierarchical folders in the cloud,
upload/organize from any device, and "get a share link for this file/folder". Skipped: desktop
sync client, collaborative editing.

## Stack

- **Next.js 15 (App Router, TypeScript)** — one deployable app: admin dashboard + public share pages + API routes.
- **Tailwind CSS 4** — brand-token driven styling.
- **Supabase** — Postgres (metadata), Auth (single admin login), Storage (files; resumable TUS
  uploads for multi-GB video). Already connected to this workspace's Supabase org.
- **tus-js-client** — resumable uploads straight from the browser to Supabase Storage
  (survives connection drops; required to genuinely replace WeTransfer/Frame.io for big video).

### Why Supabase over S3+custom / self-rolled

- Storage gives TUS resumable uploads, signed URLs, and image transforms out of the box.
- Postgres + RLS means the public share pages can be served by anon-key clients with
  database-enforced access rules; no bespoke auth layer to get wrong.
- One `supabase` project is the entire backend; the Next.js app deploys anywhere (Vercel/Fly/VPS).

## Data model (single-tenant)

```
projects        id, kind ('gallery'|'review'|'transfer'|'drive'), title, slug, description,
                cover_asset_id, settings jsonb, archived_at, created_at, updated_at
folders         id, project_id, parent_id, name            -- drive hierarchy / gallery sets
assets          id, project_id, folder_id?, filename, storage_path, mime, size_bytes,
                width?, height?, duration_s?, version, version_of?, position, created_at
comments        id, asset_id, parent_id?, author_name, is_admin, body,
                timecode_s?, resolved_at?, created_at      -- review module
share_links     id, project_id, slug (unguessable), label, password_hash?, expires_at?,
                allow_downloads, download_size ('original'|'web'), max_downloads?,
                download_count, view_count, revoked_at, created_at
favorites       id, share_link_id, asset_id, client_name?, created_at   -- proofing
activity        id, project_id, share_link_id?, event, meta jsonb, created_at
```

- **Share links are the only public entry point.** `/s/{slug}` resolves the link server-side
  (service role), checks password/expiry/revocation, then renders the right template for the
  project kind. Files are streamed via short-lived signed URLs minted per request.
- **RLS**: authenticated admin has full access; `anon` has *no* direct table access — all public
  reads go through server routes that validate the share link first. Defense in depth.
- **Storage buckets**: `originals` (private). Web-size/thumbnails via Supabase image transforms
  on signed URLs (no pre-generation pipeline to maintain).

## Auth

Single admin (isaac@isaacpoole.co) via Supabase email/password. `/studio/**` (admin) is guarded by
middleware; `/s/**` (client share pages) is public with per-link password when set.

## Brand direction (v1 — to refine in the UI pass)

Editorial, timeless, gallery-like — matching isaacpoole.co ("timeless, sophisticated imagery"):

- **Wordmark**: `ISAAC POOLE` letterspaced caps; product area labeled `STUDIO`.
- **Palette**: near-black ink `#111110`, warm paper `#FAF9F7`, muted stone greys, one restrained
  accent (`#8C7B64` bronze) for interactive states. Photography stays the only color on screen.
- **Type**: serif display (Cormorant Garamond) for titles, neutral grotesque (Inter) for UI.
- **Layout**: generous whitespace, hairline rules, uppercase micro-labels — like a printed portfolio.

## Repo layout

```
docs/            this file + setup docs
supabase/        SQL migrations (applied via Supabase MCP / CLI)
src/app          Next.js routes: /studio (admin), /s/[slug] (public), /api
src/lib          supabase clients, share-link auth, upload helpers, zip streaming
src/components   UI building blocks
```

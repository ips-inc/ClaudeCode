# Poole Studio

Self-hosted client file delivery for **Isaac Poole** — one on-brand app that replaces
Pixieset, Frame.io, WeTransfer, and Dropbox for a working photographer:

| Module | Replaces | What it does |
|---|---|---|
| **Gallery** | Pixieset | Client photo galleries: cover page, masonry grid, lightbox, client favorites ("selects"), per-photo & zip downloads |
| **Review** | Frame.io | Video/image review: player with timecode-pinned comments, replies, resolve/reopen, version stacking (v1, v2, …) |
| **Transfer** | WeTransfer | Send big files behind one link: expiry date, optional password, download counting & limits, download-all zip |
| **Drive** | Dropbox | Personal cloud folders: upload anything, organize, share any folder read-only |

Everything is delivered through **share links** (`/s/<unguessable-slug>`): each link can have a
password, expiry date, download switch, max-download cap, and tracks views/downloads. Revoke a
link at any time without touching the files. Clients never need an account.

The admin side lives at **`/studio`** — single login, project list, uploads (resumable TUS, so
multi-gigabyte video survives flaky connections), share-link management, and an activity feed of
every view / download / comment / favorite.

## Stack

Next.js 15 (App Router) · Tailwind CSS 4 · Supabase (Postgres + Auth + Storage) · tus-js-client

## Quickstart

```bash
cp .env.example .env.local     # fill in values — see docs/SETUP.md
npm install
npm run dev                    # http://localhost:3000
```

- `docs/SETUP.md` — backend provisioning state, the one manual key step, and deploy instructions
- `docs/ARCHITECTURE.md` — research notes, data model, and design decisions

## Repo layout

```
supabase/migrations/   SQL schema (already applied to the Supabase project)
src/app/studio         admin dashboard (auth required)
src/app/s/[slug]       public share pages (gallery / review / transfer / drive)
src/app/api/share      download, zip-stream, and view-count endpoints
src/components         UI building blocks (uploader, review viewer, share views)
src/lib                supabase clients, share-link auth, helpers
```

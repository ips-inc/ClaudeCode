# Studio OS — the plan

The system is no longer a client-delivery app. It's the operating system for
Isaac Poole Studio — one login, role-gated, four worlds. This doc is the
reference for what we're building and in what order.

## The four worlds

### 1. The Desk (home) — `/studio`
The command center the team lands on. Live signals: active projects, storage
used, what's live with clients, recent uploads, and (once Money is wired)
invoices due / overdue. Fast paths back into the work.

### 2. Files — a 1:1 Frame.io — `/studio/files`, `/studio/p/[id]`
The daily driver and file-management home. Where all work is dropped and where
outside editors/collaborators are brought in.

- ✅ Projects grouped by client
- ✅ **Tags + custom tags** (studio-wide vocabulary, colors, per-file, filter)
- ✅ **Open any file** — images, video (frame-accurate review), everything else
- ✅ Large-file multipart upload (any size, any type)
- ⏳ In-project search + sort + list/grid view
- ⏳ Folders across all project kinds + move-between-folders
- ⏳ Per-project collaborator invites (outside editors) — needs email/auth flow
- ⏳ Versions / stacks (v1, v2 of the same cut)

### 3. Deliver (client-facing) — `/deliver`
Clean galleries for final image/video handoff. Password / expiry / download
controls. The only surface clients see. Lives apart from the hub home.

- ✅ Galleries, share links, access log
- ⚠️ **Public share links need the `service_role` key repasted in Vercel**
  (the paste got corrupted). Everything authenticated already runs on the
  session + RLS, so this only affects unauthenticated `/s/...` links.

### 4. Money (accountant-grade, owner-only) — `/studio/money`
Estimates → client accepts/declines → invoice → payment → **Zoho Books sync**.

- ✅ Scaffolded: AR tiles + the estimate→invoice→pay→sync flow laid out
- ⏳ Real wiring. Needs, from Isaac:
  - Payment rails. Client ask: **easy to pay — card, ACH, wire, Zelle.**
    Plan: **Stripe** for card + ACH (hosted invoice, accept/decline estimate);
    **wire & Zelle** shown as mark-as-paid with auto-generated instructions on
    the same invoice. (`pay.isaacpoole.co` can front this if we learn its stack.)
  - **Zoho Books** OAuth app + tokens in the app env so the deployed site can
    read/write invoices at runtime (the MCP is a build-time tool, not runtime).

## Cross-cutting
- ✅ **Dark / light theme**, follows system by default, toggle in the rail
- ✅ Auth on the session + **RLS** everywhere (service role only where there's
  no session: public share, worker jobs, best-effort audit)
- Roles: owner, collaborator (team/outside editor), client

## MVP cut (agreed order)
1. ✅ **Foundation** — shell, The Desk, theme, Money scaffold
2. 🔨 **Files = Frame 1:1** — the first deep module (in progress)
3. **Money** — once payment rails + Zoho creds are decided/connected
4. Polish + collaborator invites

## Open items needing Isaac
- Repaste `SUPABASE_SERVICE_ROLE_KEY` in Vercel → share links work
- Decide payment processor path (Stripe vs `pay.isaacpoole.co`)
- Provide Zoho Books OAuth credentials for runtime sync

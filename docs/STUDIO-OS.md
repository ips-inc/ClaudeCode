# Studio OS — the plan

The system is the operating system for Isaac Poole Studio — one login,
role-gated, four worlds. This doc tracks what's built and what's left.

## The four worlds

### 1. The Desk (home) — `/studio`
✅ Command center: greeting, live tiles (active projects, storage used, live
deliveries, **outstanding AR + overdue**), recent uploads, live-with-clients.

### 2. Files — a 1:1 Frame.io — `/studio/files`, `/studio/p/[id]`
- ✅ Projects grouped by client
- ✅ **Tags + custom tags** (studio vocabulary, colors, per-file, filter)
- ✅ **Open any file** — images, video review, everything else
- ✅ Large-file multipart upload (any size), drag-drop
- ✅ In-project **search + sort**
- ✅ **Collaborators** — outside editors added per client (`/studio/team`)
- ✅ Move files between folders; bulk select/tag/delete
- ✅ **Versions / stacks** — upload v2 onto any file; grid shows the newest cut
      with a version badge, the viewer gets a version picker (per-version
      comments and tags), and share links always deliver the latest version
- ⏳ Brand-new-user email invites (needs email/invite setup)

### 3. Deliver (client-facing) — `/deliver`, `/s/[slug]`
- ✅ Galleries, access log, and **public share links** — now served through an
  anonymous RPC gateway, no service-role key needed (this was the "share links
  don't work" fix; passwords verified in-DB, links re-checked on every call).

### 4. Money (accountant) — `/studio/money`, client at `/i/[id]`
- ✅ Estimates & invoices with line items, live totals, per-kind numbering
- ✅ Real AR dashboard: outstanding / overdue / awaiting approval / paid 30d
- ✅ Send, record payments (card/ACH/wire/Zelle/check), mark paid, convert
      approved estimate → invoice
- ✅ Client view: approve/decline an estimate, see amount due + how-to-pay
- ⏳ **Online card/ACH payment** (needs a Stripe connection)
- ⏳ **Zoho Books sync** (needs Zoho OAuth creds in the app env — the MCP is a
      build-time tool, the deployed app needs its own credentials)

## Cross-cutting
- ✅ **Dark / light theme**, follows system, toggle in the rail
- ✅ Auth on the session + **RLS** everywhere; service role only where there's
      truly no session (now just the worker jobs queue + best-effort audit)
- Roles: owner, collaborator (team/outside editor), client

## What still needs Isaac
1. **Stripe** connection → online card/ACH pay + hosted checkout on invoices
2. **Zoho Books** OAuth credentials → finance docs sync to Zoho automatically
3. (Optional) email/invite setup → invite brand-new collaborators by email
4. **R2 lifecycle rule** (Cloudflare dashboard → bucket → Settings → add rule:
   "Abort incomplete multipart uploads after 7 days"). Abandoned multi-GB
   uploads otherwise keep billing storage forever — one click prevents it.

Everything else in the original brief is built and deployed.

# Apollo.io MCP integration

This repo wires up [Apollo.io](https://apollo.io)'s hosted MCP server so Claude
Code sessions can search and enrich B2B contacts, people, and companies, and
drive Apollo sequences — as a **build-time tool**, the same way the Supabase and
Zoho Books MCPs are used here.

> Build-time only. Like the Zoho Books MCP (see `docs/STUDIO-OS.md`), this is a
> tool the developer/agent uses while building — it is **not** wired into the
> deployed Next.js app and the app never reads `APOLLO_API_KEY`. If the studio
> app itself ever needs Apollo data at runtime, that's a separate feature with
> its own server-side credentials.

## What's wired

`.mcp.json` (project-scoped, committed) registers the remote server:

```json
{
  "mcpServers": {
    "apollo": {
      "type": "http",
      "url": "https://mcp.apollo.io/mcp",
      "headers": { "X-Api-Key": "${APOLLO_API_KEY}" }
    }
  }
}
```

- **Transport** — remote streamable HTTP at `https://mcp.apollo.io/mcp` (Apollo
  hosts it; nothing runs locally).
- **Auth** — Apollo authenticates with an API key sent in the `X-Api-Key`
  request header. The value is expanded from the `APOLLO_API_KEY` environment
  variable at load time, so the secret is never committed.

## Setup

1. **Get an API key** — Apollo dashboard → **Settings → Integrations → API →
   API Keys**. Most MCP endpoints (people/company search, enrichment,
   sequences) require a paid Apollo plan; check the scopes on the key.

2. **Export it** where your Claude Code session can see it — either your shell
   profile or `.env.local` (gitignored):

   ```bash
   export APOLLO_API_KEY="your-apollo-api-key"
   ```

3. **Approve the server.** Project-scoped servers in `.mcp.json` are trust-gated:
   the first time Claude Code loads this project it asks whether to enable the
   `apollo` server. Approve it once. Verify with `/mcp` (or `claude mcp list`) —
   `apollo` should read **connected**.

## Notes

- **`.mcp.json` is committed on purpose** so the server config travels with the
  repo; only the secret (`APOLLO_API_KEY`) stays out of git via env expansion.
- If `apollo` shows as failed in `/mcp`, the usual causes are an unset/empty
  `APOLLO_API_KEY`, a key without the right plan/scopes, or the session not
  having re-read the env after you exported the key (restart the session).
- Apollo enforces per-plan rate limits; the MCP surfaces Apollo's own errors
  when you hit them.

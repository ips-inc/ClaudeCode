# Higgsfield — Setup & Clone Pipeline (CLI + MCP)

Higgsfield is more than the cinematic-motion tool it's known for — its CLI exposes a
**near-complete clone pipeline**: character training (**Soul ID**), **voices**, and
**image/video generation**. This doc captures the exact commands and how they slot into
your workflow.

> **Verified in this session:** `@higgsfield/cli` **v1.1.5** installs cleanly
> (`npm install -g @higgsfield/cli`) and runs (`higgsfield`, alias `hf`).

---

## ⚠️ Important: it does NOT work from the cloud (web) session — run it locally

Two hard blockers in this Claude-Code-on-the-web environment:

1. **Network policy blocks Higgsfield's servers.** The environment's egress proxy rejects
   `mcp.higgsfield.ai`, `api.higgsfield.ai`, and `higgsfield.ai` with **403 (policy
   denial)**. npm works only because package registries are separately allowlisted.
2. **Login is browser OAuth.** `higgsfield auth login` opens a browser with a loopback
   callback — there's no browser in this headless session.

**So run Higgsfield on your own machine** (Claude Code desktop/CLI, or just your terminal),
where egress is open and you have a browser. Everything below is for that local context.

*(Alternative: an admin could add `*.higgsfield.ai` to this web environment's network
policy — see https://code.claude.com/docs/en/claude-code-on-the-web — but local is simpler.)*

---

## One-time setup (local)

```bash
npm install -g @higgsfield/cli     # installs `higgsfield` / `hf`
hf auth login                      # browser OAuth
hf workspace select               # pick your billing workspace (if prompted)
hf account                        # check credits
```

---

## The clone pipeline, mapped to real commands

### 1. Upload your references
```bash
hf upload create ./me1.jpg         # returns an upload UUID; repeat per file
hf upload list --image             # see uploaded image IDs
```

### 2. Train your likeness — Soul ID (Higgsfield's answer to a LoRA)
Use **5–20** curated photos (see `docs/photo-generation.md` for how to curate).
```bash
hf soul-id create --name ISAAC_P --soul-2 \
  --image ./me1.jpg --image ./me2.jpg --image ./me3.jpg \
  --image ./me4.jpg --image ./me5.jpg
hf soul-id list                    # grab the soul_id
hf soul-id wait <soul_id>          # poll until training finishes
```
- `--soul-2` = the Soul 2.0 model (general realism). `--soul-cinematic` = the cinematic
  variant — great for your 🎬 Professional look.

### 3. Generate on-model stills
Model names are examples — run `hf model list` / `hf model get <job_type>` for the current
set and each model's accepted params.
```bash
# check cost first
hf generate cost <image_model> --prompt "..."
# create (paste a prompt from prompt-builder.html), referencing your trained face
hf generate create <image_model> \
  --prompt "photo of ISAAC_P, walking a Williamsburg sidewalk, golden hour, shot on iPhone, natural skin texture, candid" \
  --image-references <soul_or_upload_id> --wait
```

### 4. Generate video
```bash
hf generate create <video_model> \
  --prompt "handheld iPhone clip, ISAAC_P walking and talking, golden hour NYC street" \
  --start-image <still_id> --wait --wait-timeout 20m --wait-interval 5s
```

### 5. Reframe to social aspect (workflow)
```bash
hf generate workflow reframe --video ./source.mp4 --aspect-ratio 9:16 --wait
```

### 6. Voice (TTS / voice-change)
```bash
hf voices list                     # find a voice id + its Voice Type (preset|element)
# cloned voices show as "element"; use --voice-id / --voice-type on the TTS/voice-change model
```

### 7. Marketing Studio (social-ad content: avatars, hooks, DTC ads)
```bash
hf marketing-studio avatars list
hf marketing-studio hooks list
hf marketing-studio dtc-ads ...    # branded image generation
```

---

## How Higgsfield fits your two-look system

| Your need | Higgsfield command | Look |
|-----------|-------------------|------|
| Locked likeness | `soul-id create --soul-2` | both |
| Cinematic likeness | `soul-id create --soul-cinematic` | 🎬 Professional |
| On-model stills | `generate create <image_model> --image-references <soul_id>` | both |
| Cinematic video + camera moves | `generate create <video_model>` | 🎬 Professional |
| 9:16 social crop | `generate workflow reframe --aspect-ratio 9:16` | both |
| Voice | `voices` + TTS model | both |
| Branded social ads | `marketing-studio dtc-ads` | 🎬 Professional |

**Where it slots in:** Higgsfield can *replace or complement* the fal.ai-LoRA + separate
video steps in `QUICKSTART.md` — Soul ID gives you the likeness and `generate` gives you
stills + cinematic video in one place. For your **first talking-to-camera clip**, HeyGen
still wins on true type-to-video lip-sync; use Higgsfield for the **hero/cinematic** pieces
and on-model still generation.

> Get the prompts from `prompt-builder.html` (Higgsfield is a tool option there, and the
> 🎬 Professional toggle matches Soul Cinematic).

---

## A ready-to-run script
`scripts/higgsfield-clone.sh` wraps steps 1–3 (upload → train Soul → generate a still) so
you can build your likeness locally in one go. Edit the variables at the top, then run it
after `hf auth login`.

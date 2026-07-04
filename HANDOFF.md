# HANDOFF — AI Clone of Isaac Poole (continue in a new session)

Paste the "PROMPT TO PASTE" block below into a fresh (ideally **local**) Claude Code session.
Local is better here: you can view generated image pixels, do browser OAuth, and the
Higgsfield connector is more stable.

---

## PROMPT TO PASTE

> I'm Isaac Poole — a NYC visual director. I'm building a hyper-real **AI clone / AI
> influencer** of myself: photoreal stills + video that look like real iPhone/editorial
> NYC content, in my voice, on my brand. Continue an in-progress build. Everything below is
> already done.
>
> **Repo:** `ips-inc/ClaudeCode`, branch `claude/ai-clone-personal-content-ibjdkz`. It
> contains the whole system — read these first:
> - `persona/persona.md` (my locked likeness, wardrobe, voice, bearing)
> - `persona/brand-reference.md` (my brand registers: Mythic↔Grounded↔Bridge — MJ, Prince,
>   Beyoncé, Solange, Colman Domingo, Franklin Saint, Hitch, MBJ/Coogler)
> - `persona/perception-taste-system.md` (registers → concrete generation directives, incl.
>   the **Shape & Silhouette** and **Realism** rules)
> - `style/iphone-nyc-aesthetic.md`, `style/cinematic-look.md`
> - `docs/higgsfield.md`, `docs/photo-generation.md`, `docs/recording-guide.md`
>
> **Tool:** I use **Higgsfield** (connected via MCP — `mcp__Higgsfield__*`). My workspace_id
> is `515bcdc6-5460-486b-8b19-f32c5f854d37` (private, Starter plan). Call
> `select_workspace` first.
>
> **My trained face models (Higgsfield "Soul"):**
> - `ISAAC_POOLE` — soul_id `7f992a56-f648-4061-8682-a162b5d7ce7c` (type soul_2, READY,
>   likeness confirmed as me).
> - `ISAAC_POOLE_2` — soul_id `e6a84e5d-a6ba-4d4e-a566-6412a81745ce` (type soul_2, trained on
>   a sharper 14-image set to fix my hairline/line-up — check status with
>   `show_characters(action:'status', soul_id:...)`; use this one if ready).
>
> **How to generate:** `generate_image({params:{model:'soul_2', soul_id:'<id>',
> prompt:'...', aspect_ratio:'3:4', count:2}})` — quality must be `1.5k` or `2k`. View with
> `job_display(id)`. Finish with `reframe` (to 9:16) and `upscale_image`. Cost ≈ 0.12
> credits/image.
>
> **My locked look:** natural **4C mini-fro with a taper**, thin mustache + light goatee,
> warm medium-brown skin, forearm tattoos (right: blackletter + winged; left wrist: small
> "create"). All-black wardrobe; for luxe fits use **Homme Plissé Issey Miyake** (matte
> micro-pleated). NYC settings.
>
> **What makes my renders GOOD (learned the hard way):**
> 1. **Realism (kills the "AI feel"):** on-camera **flash** (hard flash shadow, bright
>    catchlights, slightly overexposed skin), **35mm film grain**, "shot on Canon EOS R5,
>    35mm lens," **candid Getty-style event photojournalism, not posed**, a **living crowd**
>    (guests mid-conversation, laughing), real skin pores/texture. Negative: plastic,
>    airbrushed, deformed hands, boxy, stiff.
> 2. **Shape, not boxy:** contrapposto (weight on one leg), body ¾ off-camera, a hand in the
>    pocket, pleats draping/flowing, negative space, caught mid-gesture. Never square/frontal.
> 3. **Registers must READ:** name the *bearing* + styling philosophy, not just the clothes —
>    e.g. "self-possessed composure (Franklin Saint), black-dandy legacy tailoring (Colman
>    Domingo), fine-art restraint (Solange)."
>
> **Voice:** Higgsfield voice-clone is paywalled for me. Plan: clone my voice on
> **ElevenLabs' free tier** (elevenlabs.io) from a clean ~2 min sample, or via Higgsfield's
> `generate_audio` (model `text2speech_v2`, variant `elevenlabs`) once a voice exists. My
> good source recording is ~6.5 min, 44.1kHz.
>
> **Do next:**
> 1. `select_workspace`, check `ISAAC_POOLE_2` status; if ready, use it.
> 2. Generate a Boom Boom Room / NYFW editorial of me in full Homme Plissé using the
>    Realism + Shape + Register recipe above; `job_display`, then `upscale_image` +
>    `reframe` to 9:16 for a post.
> 3. Then move to **video** (`generate_video`) and the AI-influencer tools (Marketing
>    Studio, Shorts Studio, `virality_predictor`).
> Always keep it REAL (not plastic), shaped (not boxy), and on-register. Label content as AI.

---

## Reference notes (context, not required in the paste)
- **Reference photos** are already uploaded to my Higgsfield account (34 total: an initial
  20-image set + a sharper 14-image set with crisp line-up, full-body, and flash candids).
  To add more, use `media_upload_widget` (browser picker → returns media_ids) then retrain.
- **Cloud caveats we hit** (should be gone locally): the web session couldn't view finished
  image pixels or do browser OAuth, and the Higgsfield MCP dropped a couple times. Local
  fixes all three.
- **Repo also has:** `prompt-builder.html`, `content-planner.html`, `QUICKSTART.md`,
  `TOOLSTACK.md`, `REFERENCES.md`, `docs/train-lora-falai.md`, `scripts/audit-references.py`,
  `scripts/higgsfield-clone.sh`.
- **Milestones hit:** likeness confirmed on v1; realism recipe (flash+grain+crowd) validated
  as "better"; taste/register system built; next frontier = shape + registers + video.

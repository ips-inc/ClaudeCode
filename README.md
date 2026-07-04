# AI Clone Studio — Hyper-Real Personal Content

A production system for creating hyper-real AI content of **you**: video, image, and
audio that looks, sounds, and acts like you — styled to feel like it was *shot on an
iPhone in New York City*. Personal, candid, real.

This repo is the **operating system** for that workflow. It doesn't render the content
itself (that happens in the AI tools below) — it gives you the locked-in identity, the
exact aesthetic recipe, and a prompt builder that fuses the two into ready-to-paste
prompts so every clip looks like the same person in the same world.

---

## The core idea

Hyper-real "clone" content fails for two reasons: the **person** drifts (face/voice/vibe
changes shot to shot) and the **look** drifts (one clip looks cinematic, the next looks
like a stock ad). This system fixes both by separating them into two locked layers that
get combined on every render:

```
  PERSONA LAYER            +   STYLE LAYER              =   one consistent clip
  (who — locked likeness)      (how — iPhone/NYC look)
  persona/persona.md           style/iphone-nyc-aesthetic.md
```

The **prompt builder** (`prompt-builder.html`) merges both layers with your scene and
outputs a tuned prompt for whichever generator you're using.

---

## The pipeline

| Stage | Goal | Tools (Jan 2026) |
|-------|------|------------------|
| **0. Capture** | Reference data of the real you | iPhone: 20–40 photos (varied angle/light), 2–3 min clean voice audio, a few short video clips |
| **1. Likeness** | A reusable, consistent face/body model | Train a character LoRA (Flux) or use a character-reference image set; Midjourney `--cref`; Higgsfield/Freepik character tools |
| **2. Voice** | Your cloned voice | ElevenLabs (Instant or Professional Voice Clone) |
| **3. Stills** | On-model reference frames & thumbnails | Flux + your LoRA, Midjourney `--cref`, Nano Banana / Seedream for edits |
| **4. Video** | The moving clip | Veo 3 (native audio), Sora 2, Kling 2.x, Runway Gen-4, Luma |
| **5. Talking/lip-sync** | Make the clone *say* things in your voice | HeyGen, Hedra, Captions, or Veo 3 native dialogue |
| **6. Finish** | The "iPhone real" final pass | Edit in CapCut/Premiere; add the grain/grade/audio layer from the style guide |

Start small: nail **one** 8-second clip end to end before scaling to a content calendar.

---

## Quick start

1. **Fill in your identity.** Copy `persona/persona-template.md` → `persona/persona.md`
   and complete every field. This is the single source of truth for your likeness.
2. **Read the look.** Skim `style/iphone-nyc-aesthetic.md` so you know what "shot on
   iPhone in NYC" means in concrete, promptable terms.
3. **Open the builder.** Open `prompt-builder.html` in any browser. Paste your persona
   details once (it saves locally), describe a scene, pick a target tool, and copy the
   generated prompt.
4. **Render → finish.** Generate in the tool, then apply the finishing pass.
5. **Browse recipes.** `prompts/example-recipes.md` has full worked examples you can
   adapt.

---

## Files

```
README.md                          ← you are here
QUICKSTART.md                      ← cloud-only path to your first talking-to-camera clip
TOOLSTACK.md                       ← what to buy/use + what to upload (the full rig)
docs/photo-generation.md           ← making photoreal stills of your clone (the foundation)
docs/higgsfield.md                 ← Higgsfield CLI/MCP setup + full clone pipeline
REFERENCES.md                      ← best-results spec for what/how to upload
scripts/higgsfield-clone.sh        ← run locally: upload → train Soul ID → on-model still
scripts/audit-references.py        ← grade your reference folder before uploading
persona/persona-template.md        ← blank identity spec to copy & fill
persona/persona.md                 ← your filled-in clone (you create this)
style/iphone-nyc-aesthetic.md      ← the "shot on iPhone in NYC" look bible
style/cinematic-look.md            ← the "professionally shot" look bible
prompts/example-recipes.md         ← full worked prompt examples per tool
prompt-builder.html                ← interactive prompt generator (iPhone/Pro toggle)
content-planner.html               ← batch a series of ready-to-shoot briefs
```

**New here?** Read `TOOLSTACK.md` first — it lays out the exact tools, the three
identity assets to build (face model, voice clone, talking avatar), and the reference
data to upload.

---

## Consent, disclosure & safety

This system is built to clone **yourself** — your own face and voice, with your consent.
That's the only intended use.

- **Only clone yourself** (or someone who has explicitly consented in writing). Cloning a
  real person without consent is a serious harm and is illegal in many places.
- **Label AI content.** Many platforms (and a growing list of laws) require disclosure
  that media is AI-generated or "synthetic." Keep a visible or metadata label.
- **Protect your training data.** Your reference photos/voice are sensitive biometric
  data. Keep them private; don't commit them to a public repo.
- **Don't impersonate to deceive** — no fake endorsements, fake news, or putting words in
  your own mouth that could mislead (e.g. financial/medical claims) without it being
  clearly you and clearly real.

A starting checklist lives in `persona/persona-template.md` under *Rights & Disclosure*.

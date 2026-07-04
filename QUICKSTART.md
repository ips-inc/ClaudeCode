# Quickstart — Cloud-Only → Your First Talking-to-Camera Clip

Your chosen path: **cloud-only, start cheap**, first deliverable = **a talking-to-camera
social clip** of your clone, iPhone-real. No GPU, no local installs — everything runs in a
browser. This is the exact order of operations. Expect your first clip in an afternoon of
setup + a day for the voice/LoRA to train.

> Everything here feeds the identity assets in `TOOLSTACK.md`. For dialing in *great
> stills* specifically, see `docs/photo-generation.md`.

---

## The path at a glance

```
 Step 0  Gather references (photos + voice + a talking video)
 Step 1  Great base photos → train a Flux LoRA, generate on-model stills   [docs/photo-generation.md]
 Step 2  Voice clone → ElevenLabs
 Step 3  Talking avatar → HeyGen (type-to-video) OR Hedra (photo + audio)
 Step 4  Script it the way you talk
 Step 5  Generate → iPhone finishing pass in CapCut
 Step 6  Disclose + post
```

Total starter cost: roughly **$50–80/mo** in credits (ElevenLabs + HeyGen/Hedra + a few $
of LoRA training). All month-to-month.

---

## Step 0 — Gather references (do this first)

Put these somewhere **private** (Drive/local) — not in this repo.
- **Photos:** 25–40, recent, just you, varied angle/expression/lighting, some full-body,
  several tight face close-ups, no filters/sunglasses/hats in most. (Details & why:
  `docs/photo-generation.md`.)
- **Voice:** 3–30 min, quiet room, one speaker, natural talking (not read-aloud).
- **Talking video:** 2–5 min looking at camera, even light, clean audio — for the HeyGen
  avatar. (You can extract the voice sample from this too.)

## Step 1 — Great base photos (the foundation of everything)

A talking clip is only as real as the face it starts from. Build your likeness first.

1. Go to **fal.ai** (or **Replicate**) → search **"Flux LoRA trainer"** (e.g.
   `flux-lora-fast-training`).
2. Upload your 25–40 photos, set a **trigger word** (your Identity tag, e.g. `ISAAC_P`),
   train. ~15–25 min, a few dollars.
3. Generate a set of **photoreal on-model stills** using the prompt builder (Flux + LoRA
   tool). Pick **one flawless front-facing, evenly-lit, neutral-expression close-up** —
   that becomes the base image for your talking avatar in Step 3.
4. Sanity-check realism: pores/skin texture present, eyes & gaze correct, teeth clean,
   **hands correct**. Regenerate until a still is indistinguishable from a real photo.

→ Full photo-gen playbook (training tips, prompting, upscaling, face-fix, alternatives):
**`docs/photo-generation.md`**

## Step 2 — Voice clone

1. **ElevenLabs** → Voice Lab → **Instant Voice Clone** (2–3 min) to start; upgrade to
   **Professional Voice Clone** (needs ~30 min audio, trains in a few hours) for the real thing.
2. Test settings: **Stability ~45%**, **Similarity ~80%**, **Style** low-moderate,
   **Speaker Boost ON**. Generate a test line — it should sound unmistakably like you.

## Step 3 — Talking avatar (pick one)

**Option A — HeyGen (recommended for "type anything"):**
1. Create a **Custom Avatar** from your 2–5 min talking video.
2. Connect your **ElevenLabs voice** (or use HeyGen's clone).
3. Type your script → HeyGen renders you saying it. This is your repeatable social engine.

**Option B — Hedra (best when you want to drive off a perfect Flux still):**
1. Upload the flawless close-up from Step 1 + your ElevenLabs audio of the line.
2. Hedra (Character-3) animates the face to the audio. Great for a single expressive clip.

*Which?* HeyGen = "type any script forever." Hedra = "one great clip from one great photo."
For a repeatable social series, set up HeyGen.

## Step 4 — Script it the way you actually talk

Open `prompt-builder.html` → **ElevenLabs** tool → it gives a VO template. Write with your
fillers and pauses (`...`, `—`, line breaks where you'd breathe). Keep it to 1–3 sentences
for a first clip. Example:

> Honestly? ... I almost didn't film this. But real quick — here's the one thing I changed.

## Step 5 — Generate → iPhone finishing pass

The raw avatar clip will look a little *too clean*. De-slick it so it reads as iPhone-real:
1. Drop it into **CapCut** (free).
2. Add **subtle handheld jitter** (small position keyframes), a **light grain** overlay.
3. Slight contrast, lift blacks a touch, warm/cool grade to a NYC time-of-day.
4. Lay **NYC ambient room tone** low under the VO; keep one real breath in.
5. **9:16 crop**, subject slightly off-center.

(Full checklist: `style/iphone-nyc-aesthetic.md` → "The finishing pass".)

## Step 6 — Disclose + post

Add a discreet **"Made with AI"** label (caption + platform's AI toggle). Only ever your
own likeness. Post.

---

## After your first clip works
- **Lock everything:** same LoRA, same voice, same base frame. Don't retrain on a whim.
- **Batch with the planner:** `content-planner.html` → generate a week of briefs → run each
  through Steps 3–5.
- **Add polish later:** when you want a "hero" piece, flip the prompt builder to
  **🎬 Professional** and bring in Higgsfield (`style/cinematic-look.md`).

---

## Cloud-only starter stack (what to sign up for)
| Job | Tool | Note |
|-----|------|------|
| Likeness / stills | **fal.ai** or **Replicate** (Flux LoRA) | pay-per-use, ~$3 to train |
| Voice | **ElevenLabs** | Creator tier |
| Talking avatar | **HeyGen** (or **Hedra**) | Creator tier |
| Edit / finish | **CapCut** | free |
| (Later) cinematic | **Higgsfield**, **Veo/Kling** | for hero pieces |

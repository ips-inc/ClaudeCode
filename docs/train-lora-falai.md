# Train Your Likeness — fal.ai Flux LoRA (click-by-click)

This turns your curated color photos into a **reusable face model** (`ISAAC_POOLE`) that
every image/video tool can reference. Cloud-only, ~$2–5, ~20 min. Runs from your machine
(this web session can't reach fal.ai to do it for you, but here's the exact path).

> Prereq: curate ~30 photos per the set in `REFERENCES.md` / the chat — color-weighted,
> hatless, your **4C mini-fro + taper**, mix of close-ups + angles + a few full-body, some
> smiling. Crop out other people. Keep them in one folder.

---

## Step 1 — Prep the images (10 min, matters a lot)
1. **Crop to just you.** Remove anyone else from the frame.
2. **Square-ish or keep native**, but make sure the face is clearly visible and sharp.
3. **Rename** so it's clean (optional): `isaac_01.jpg … isaac_30.jpg`.
4. **Remove near-duplicates** — 30 varied beats 60 similar. (Run
   `python3 scripts/audit-references.py <folder>` to flag dupes + low-res.)
5. **Zip** the folder → `isaac_refs.zip`.

## Step 2 — Train on fal.ai
1. Go to **fal.ai** → sign in → add a little credit ($5 is plenty).
2. Open the **FLUX LoRA Trainer** (search "flux-lora-fast-training" or "FLUX.1 [dev] LoRA
   trainer").
3. **Upload** `isaac_refs.zip`.
4. Set the **trigger word**: `ISAAC_POOLE` (this is the token you'll put in every prompt).
5. Settings for a face:
   - **Steps:** ~1000–1200 (good default for identity; higher risks "overbaked")
   - **Learning rate:** leave default
   - **Captioning:** auto/enabled is fine
6. **Run.** ~15–25 min. When done, **download the `.safetensors`** and/or note the hosted
   model ID.

## Step 3 — Generate a test still & check realism
Use the **Flux + LoRA** tool in `prompt-builder.html` (📱 iPhone or 🎬 Pro), or on fal
directly:
```
photo of ISAAC_POOLE, head-and-shoulders, looking at camera, natural window light,
natural skin texture with visible pores, not retouched, photoreal, sharp focus on the eyes
```
- **Guidance ~3.5, 28–32 steps.**
- If the face looks "baked"/plastic → **lower LoRA weight to ~0.8** and regenerate.
- If likeness is weak → raise weight toward 1.0, or add a few more close-ups and retrain.
- Run the **5-point QC** (eyes, skin, teeth, hands, edges) from `docs/photo-generation.md`.
- Generate in **batches of 6–8**, keep the 1–2 that look exactly like you. Save the seed.

## Step 4 — Lock it
Once a still is indistinguishable from a real photo of you:
- **Save the model ID + a couple of hero seeds/prompts.** Reuse them everywhere.
- Pick **one flawless front-facing, evenly-lit close-up** — that's the base frame for your
  **HeyGen/Hedra talking avatar** and for **image→video** (Kling/Runway) later.

---

## Why this gets you "REAL" (not AI-looking)
- **Color training data** → true skin tone (the B&W shots couldn't teach it).
- **Your locked 4C taper** across many shots → hair reads as *yours*, every time.
- **"natural skin texture, visible pores, not retouched"** in every prompt → kills the plastic look.
- **Upscale finals in Topaz** → real-camera micro-detail, the last 10%.

## Alternative: Higgsfield Soul ID (same idea, run locally)
If you'd rather use Higgsfield (you installed the CLI): `scripts/higgsfield-clone.sh` does
upload → `soul-id create --soul-2` → generate, locally. Same curated set. See
`docs/higgsfield.md`. fal.ai is the simpler cloud path; either works.

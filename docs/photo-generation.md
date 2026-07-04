# Great Photo Generation — Photoreal Stills of Your Clone

Stills are the backbone of the whole system: your talking avatar starts from a photo, your
video tools start from a frame, and your thumbnails/carousels *are* photos. If the stills
are great, everything downstream is great. This is the guide to making them
indistinguishable from real photos of you.

Cloud-only, no GPU required.

---

## Why a trained LoRA beats everything else

For a **1:1 clone**, a **trained Flux LoRA** is the gold standard — it *learns your face*
rather than approximating it from one reference. Ranked:

| Approach | Likeness | Consistency | Effort | Use it for |
|----------|----------|-------------|--------|------------|
| **Flux LoRA (trained)** ⭐ | Highest | Highest | Train once (~20 min, ~$3) | Your master likeness — everything |
| **Higgsfield "Soul" / character** | High | High | Upload refs | Fast cinematic stills |
| **Midjourney `--cref`** | Medium-high | Medium | None | Moodboards, quick looks |
| **Nano Banana / Seedream (edit)** | n/a (edits) | — | None | Fixing/inpainting a good frame |

Build the **Flux LoRA first**. Use the others to extend or edit what it produces.

---

## Training data = 90% of the result

The LoRA can only be as good as your photos. Aim for **25–40 images**:

**Coverage (the mix that matters):**
- **Angles:** front, 3/4 left, 3/4 right, a couple of profiles, a few looking slightly up/down
- **Expressions:** neutral, genuine smile, talking/mid-word, serious
- **Framing:** several tight face close-ups (most important), some upper-body, a few full-body
- **Lighting:** vary it — daylight, indoor, soft, harder. Variety teaches the model *you*, not one lighting setup
- **Distance:** close and medium; avoid tiny faces in wide shots

**Quality rules (each one prevents a failure mode):**
- **Sharp & high-res**, in focus — blurry shots poison the model
- **Just you** — no other people, no pets in frame
- **No heavy filters/beauty smoothing** — you want *your real skin*, or the clone looks plastic
- **No sunglasses/hats** in most; don't hide the face
- **Recent & consistent** appearance (same era of haircut/weight) — mixing very different looks confuses it
- **Neutral-ish backgrounds** help; some variety is fine
- **Consistent-ish** but not identical — 40 near-duplicate selfies = a rigid, one-pose model

> Garbage in, uncanny out. Curating 30 great photos beats dumping 100 mediocre ones.

---

## Training (fal.ai or Replicate)

1. **fal.ai** → search **Flux LoRA fast training** (or Replicate → `ostris/flux-dev-lora-trainer`).
2. Upload your curated set (zip or drag-in).
3. Set a **unique trigger word** = your Identity tag (e.g. `ISAAC_P`, `ohwx_isaac`). Use
   something that isn't a real word/celebrity so it doesn't collide.
4. **Steps:** ~1000–1500 for a face is a good start. Too many = "overbaked" (rigid,
   artifact-prone); too few = weak likeness.
5. Train (~15–25 min). Download the LoRA `.safetensors` **or** just use it hosted on the platform.

**If the result is off:**
- *Doesn't look enough like me* → more/better close-ups, more steps, raise LoRA weight toward 1.0
- *Looks "baked"/rigid/plasticky* → fewer steps, **lower LoRA weight to ~0.75–0.85**, more varied training poses

---

## Prompting for photoreal (kills the "AI look")

Use the **Flux + LoRA** tool in `prompt-builder.html` — it assembles these for you. The
anatomy of a photoreal prompt:

```
photo of {{TAG}}, [action], [location], [lighting],
natural skin texture with visible pores, not retouched, photoreal,
[iPhone snapshot  OR  cinema still, shallow depth of field],
sharp focus on the eyes
```

**The realism amplifiers (say these explicitly):**
- `natural skin texture with visible pores, subtle imperfections, not airbrushed`
- `catchlights in the eyes, sharp focus on the eyes`
- `slight asymmetry, candid` (perfect symmetry reads as AI)
- For iPhone look: `shot on iPhone, deep depth of field, casual snapshot`
- For pro look: `85mm, shallow depth of field, soft key light, film grain`

**Negatives (where supported):** `plastic skin, airbrushed, over-smooth, waxy, over-saturated, extra fingers, deformed hands, asymmetric eyes, extra teeth`

**Settings (Flux):** guidance ~3–4, 28–32 steps. Generate in **batches of 6–8** and cull —
realism is a numbers game; you keep the 1-in-8 that's flawless.

---

## The 5-point realism QC (check every keeper)

Most "AI tells" hide in the same 5 places. Reject a still if any fails:
1. **Eyes** — symmetric? both looking the same direction? natural catchlights?
2. **Skin** — pores/texture present, *not* waxy or over-smoothed?
3. **Teeth** — normal count/shape, not a fused blur?
4. **Hands/fingers** — correct count, natural bends? (the #1 giveaway)
5. **Ears/jewelry/hair edges** — no melting, no impossible geometry?

## Fixing a *nearly* perfect frame
- **Face/eyes slightly off** → run through an inpaint/edit model (**Nano Banana**,
  **Seedream**, or Flux Fill) and repaint just that region.
- **Too soft / low-detail** → **upscale** (Topaz Photo AI, or an ESRGAN/clarity upscaler on
  fal) to add real-camera micro-detail. Do this **last**.
- **Skin too smooth** → add a subtle skin-texture/grain pass in the upscaler or editor.

---

## Consistency across a whole series

To keep the *same* face across dozens of posts:
- **Reuse the same LoRA + trigger word** everywhere. Don't retrain casually.
- **Log good seeds** — note the seeds/prompts that produced flawless on-model results and reuse them.
- **Keep 3–5 "hero" reference stills** you trust; when a tool supports image reference
  (Kling, Runway, Hedra), feed one of those so motion/lip-sync starts on-model.
- **One wardrobe change at a time** — lock the face, vary the scene.

---

## Great-photo checklist (tape this to your monitor)
- [ ] Trained LoRA, not just a single reference
- [ ] 25–40 curated, sharp, varied, filter-free training photos
- [ ] Trigger word set and used in every prompt
- [ ] "natural skin texture, visible pores, not retouched" in the prompt
- [ ] Generated in batches; culled to the flawless ones
- [ ] Passed the 5-point QC (eyes, skin, teeth, hands, edges)
- [ ] Upscaled last for real-camera detail
- [ ] Saved seed + prompt for the keepers

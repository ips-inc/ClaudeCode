# Worked Prompt Recipes

Full, end-to-end examples you can adapt. Each fuses the **persona layer** (placeholder
`{{PERSONA}}` — your locked face/wardrobe/voice description) with the **style layer**
(iPhone/NYC) and a specific scene. Swap in your own `persona/persona.md` details.

> Placeholders: `{{PERSONA}}` = your face+wardrobe sentence, `{{TAG}}` = your identity tag,
> `{{ACTION}}` = what you're doing, `{{LINE}}` = what you say.

---

## 1. Veo 3 — walk-and-talk with native audio (best all-rounder for talking clips)

Veo 3 generates synced audio + dialogue, so you can often skip a separate lip-sync step.

```
A candid vertical 9:16 video. {{PERSONA}} walks down a Williamsburg sidewalk past a
bodega and parked yellow cabs, late golden-hour sun raking between the buildings.
He's mid-conversation with whoever is filming, talking with his hands, a real half-smile.

He says, casually, looking just off-camera: "{{LINE}}"

Shot on an iPhone main wide 26mm lens, handheld with natural shake and small reframing,
deep depth of field so the street stays in focus, available golden-hour light with warm
flare and slightly blown highlights. Hyper-realistic, natural skin texture with visible
pores, not retouched, authentic micro-expressions. Real NYC street ambience: distant
traffic, chatter, a far-off siren. Looks like real amateur iPhone footage, light grain,
mild over-sharpening. Not cinematic, not gimbal-smooth.
```

**Tips:** keep dialogue to one or two short sentences for an 8s clip. Put the spoken line
in quotes. Describe the *emotion* of delivery, not just the words.

---

## 2. Sora 2 — physical, multi-shot scene

Sora is strong on physics, motion, and longer coherent action.

```
Vertical iPhone-style clip, handheld. {{PERSONA}} jogs up the steps of a Brooklyn
brownstone stoop, slightly out of breath, turns and flops down onto the top step,
laughing. A delivery cyclist passes behind on the street. Overcast flat daylight, wet
pavement from earlier rain reflecting the gray sky.

Filmed on an iPhone, 26mm wide, deep focus, handheld micro-shake and a quick autofocus
hunt as he sits. Natural skin texture, sweat sheen, flyaway hair, candid. Slightly
off-center framing, a little crop on the head. Light sensor noise in the shadows, mild
compression. Real, amateur, home-video energy — not cinematic.
```

---

## 3. Kling 2.x — image-to-video (most consistent face)

Best practice: generate an on-model still first (Flux+LoRA / Midjourney `--cref`), then
animate it. The face stays locked because it starts from your reference frame.

**Start frame (still):** render `{{PERSONA}}` at a specific NYC location in the iPhone look.
**Motion prompt:**

```
The person turns their head toward the camera and gives a small, genuine smile, then
looks back out at the street. Subtle handheld camera shake, a gentle breeze moves their
hair, city traffic and pedestrians move naturally in the background. Realistic, candid
iPhone footage, natural motion, no morphing of the face.
```

**Tip:** keep motion *small* on image-to-video to avoid the face warping. One clean
action per clip.

---

## 4. ElevenLabs — voice clone settings & VO script

1. Create a **Professional Voice Clone** from your 2–3 min clean sample (quiet room, one
   mic, natural speech). Instant Clone works for quick tests.
2. Generate the line. Settings rules of thumb:
   - **Stability ~40–55%** — lower = more expressive/variable, higher = more consistent
   - **Similarity ~75–85%** — high to stay on-voice
   - **Style** low-to-moderate; **Speaker boost** on
3. Write VO the way you *talk*, with your fillers and pauses (use `...`, `—`, line breaks):

```
Honestly? ... I almost didn't film this.
But I'm walking through the Lower East Side and the light's just— it's stupid good right now.
So. Quick thought, then I'll let you go.
```

**Tip:** record/keep a few "breath" and "uh" takes; sprinkling real imperfection in the
final edit sells it.

---

## 5. HeyGen / Hedra — lip-sync a still or avatar to your cloned voice

Use when your video tool can't do dialogue, or you want a clean talking-head.

1. Provide a **photo or short clip** of your on-model clone (from stage 3) + the
   **ElevenLabs audio**.
2. Hedra/HeyGen drives the mouth/face to the audio.
3. **Then** run the result through the style finishing pass (grain, handheld jitter,
   NYC ambient bed) so the talking head doesn't look too clean/studio.

```
Talking-head of {{PERSONA}}, framed like a selfie video held at arm's length on a
Manhattan rooftop at blue hour, water towers and a few lit windows behind. He's telling
a quick story to camera. Casual, warm, slight smile.
```

---

## 6. Midjourney / Flux — on-model stills (thumbnails, references, carousels)

**Midjourney (with character reference):**
```
{{PERSONA}}, sitting on a subway platform bench waiting for the train, looking off down
the tunnel, harsh fluorescent light, candid iPhone snapshot, 9:16 --cref <your_ref_url>
--cw 80 --style raw --ar 9:16
```

**Flux + your LoRA:**
```
photo of {{TAG}}, leaning on a graffiti-covered wall in the East Village, overcast
daylight, shot on iPhone, candid, natural skin texture with pores, slightly off-center,
amateur snapshot, deep depth of field
```

---

## Scaling to a content series (after one clip works)

- **Lock the reference.** One face model, one voice clone, 3–5 wardrobe looks. Don't retrain on a whim.
- **Repeat locations.** Reuse 4–6 NYC spots so it reads as *your life*.
- **Batch by time-of-day.** Shoot a week of "golden hour walk-and-talks" in one session.
- **Keep a seed/style log.** Note which seeds, tools, and settings gave the best on-model
  results; reuse them.
- **Always finish + label.** Every clip gets the finishing pass and an AI disclosure.

# Reference Uploads — The Best-Results Spec

Your clone is only as good as what you feed it. This is the exact spec for **what to
upload, where, and how many**, tuned for maximum realism. Organize your local
**"AI CLONE"** folder to match the structure at the bottom, then run
`scripts/audit-references.py` to grade it before you upload anything.

> These files are **biometric data** — keep them local/private. Don't commit them to this
> repo (it's attached to a public PR).

---

## The 4 reference sets you need

| Set | Feeds | How many | The one thing that matters most |
|-----|-------|----------|-------------------------------|
| **A. Face/likeness photos** | Flux LoRA / Higgsfield Soul ID | 25–40 (Soul: 5–20) | variety of angle/expression/light |
| **B. Talking video** | HeyGen avatar | 2–5 min | even light, clean audio, look at lens |
| **C. Voice audio** | ElevenLabs | 3–30 min | quiet room, natural talking |
| **D. Wardrobe shots** | style consistency | 5–15 | your 3–5 signature looks, full-body |

---

## Set A — Face / likeness photos (the core)

**Target: 25–40 for a Flux LoRA; 5–20 for Higgsfield Soul ID.** Quality beats quantity —
30 great photos beat 100 mediocre ones.

**The coverage mix (aim for roughly this spread):**
- **~40% tight face close-ups** — this is what locks your face. Sharp, well-lit, filling the frame.
- **~30% head-and-shoulders**, varied angles: front, 3/4 left, 3/4 right, a couple of near-profiles.
- **~20% upper body / medium** shots.
- **~10% full body** (for proportions & posture).
- **Expressions:** neutral, genuine smile, mid-talk, serious — spread across the set.
- **Lighting variety:** daylight, indoor, soft, harder. Variety teaches the model *you*, not one setup.

**Specs:**
- **Resolution:** ≥ 1024px on the short side; ≥ 2000px preferred. Higher = more detail learned.
- **Format:** JPG or PNG. Straight-from-camera, not screenshots.
- **Focus:** tack sharp. Any blur/motion = cull it.

**Hard don'ts (each causes a specific failure):**
- ❌ Filters / beauty smoothing / heavy retouch → plastic, fake clone
- ❌ Sunglasses, hats, hands on face (in most) → hidden/occluded features
- ❌ Other people or pets in frame → identity confusion
- ❌ Very different eras (old haircut/weight mixed with current) → drift
- ❌ Duplicates / 30 near-identical selfies → rigid one-pose model
- ❌ Heavy shadow hiding half the face → missing data
- ❌ Extreme wide-angle selfie distortion → warped proportions learned

## Set B — Talking video (for the HeyGen avatar)

- **2–5 minutes**, one continuous-ish take is fine.
- **Look at the lens.** Talk naturally — a story, reading, anything with normal mouth movement.
- **Even, soft light** on your face (window light works). No harsh shadows.
- **Clean audio** — quiet room; this doubles as a voice sample.
- **Framing:** head-and-shoulders, centered, stable (tripod/propped phone), 1080p+.
- Minimal head-turning away from camera; keep the face visible.

## Set C — Voice audio (for ElevenLabs)

- **Instant clone:** 2–3 min is enough to test. **Professional clone:** aim **30 min**.
- **Quiet room**, one microphone, **one speaker (just you)**, no music/background.
- **Natural conversational delivery** with real emotion — *not* flat read-aloud.
- **Format:** WAV or high-bitrate MP3/M4A. Consistent mic/room across clips.
- Include range: calm, excited, a laugh — ElevenLabs learns your expressiveness.

## Set D — Wardrobe shots

- **5–15** photos of your **3–5 signature looks** (full-body + detail of accessories).
- Even light, plain background ideal. These lock your visual "uniform."

---

## Recommended "AI CLONE" folder structure

Organize locally like this so the audit script can grade each set:

```
AI CLONE/
├── A_face/              ← 25–40 likeness photos (close-ups, angles, expressions)
├── B_talking_video/     ← your 2–5 min talking-to-camera clip(s)
├── C_voice/             ← 3–30 min clean voice audio
├── D_wardrobe/          ← 5–15 signature-look shots
└── _rejects/            ← where the audit script suggests moving culls
```

## Before you upload: audit the folder
```bash
python3 scripts/audit-references.py ~/Documents/"AI CLONE"
```
It reports counts vs targets, flags low-res/duplicate/oversized files, checks video &
audio duration, and prints a keep/cull summary per set. Fix what it flags, re-run, then
upload the winners to each tool.

---

## Where each set gets uploaded
- **A_face** → fal.ai/Replicate Flux LoRA trainer, **or** `hf soul-id create --image …`
- **B_talking_video** → HeyGen → Create Custom Avatar
- **C_voice** → ElevenLabs → Voice Lab → Add Voice
- **D_wardrobe** → keep as reference for prompts; a few can join the LoRA set

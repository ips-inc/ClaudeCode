# Recording Guide — How to Not Sound Like a Robot (and Look Real)

Isaac's one non-negotiable: the clone must **look real** and **sound like him** — no
AI-robot voice. That outcome is decided *before* any tool runs, by the quality of what you
feed it. This guide is the recording recipe for both.

The robot voice is almost never the model's fault — it's **low-quality or flat input**.
Fix the input and ElevenLabs sounds startlingly like you.

---

## PART 1 — Voice (the anti-robot recipe)

### Why your current clips will sound a little "AI"
The 5 samples you sent total 4m45s but are **phone/message-compressed** (16–24 kHz,
24–32 kbps, one clip noisy). ElevenLabs can *test* on these, but compressed + flat audio is
exactly what produces the thin, robotic result. To sound truly like you, re-record clean.

### The 6 rules that kill the robot sound
1. **Quiet, soft room.** No AC/traffic/echo. A carpeted room or closet with clothes beats a
   bare tiled room. Silence between sentences should be *truly* silent.
2. **One good mic, close.** AirPods are okay; a $50–100 USB mic (or a lav) is better. Stay
   **6–10 inches** away, slightly off-axis to avoid popping.
3. **Record HIGH quality.** 44.1kHz, WAV or 256k+ AAC. On iPhone: Voice Memos → Settings →
   **Lossless**. Don't send it as a "message" (that re-compresses it).
4. **Talk, don't read.** The #1 anti-robot trick. Tell a real story to a friend. Reading
   aloud flattens your prosody — that flatness *is* the robot sound.
5. **Bring real emotion + range.** Include a laugh, a serious beat, an excited beat, a quiet
   beat. ElevenLabs learns your *expressiveness*, not just your timbre.
6. **Quantity for the real clone.** 10–30 min of clean audio for a **Professional Voice
   Clone**. More good material = more "you."

### What to record (aim ~15–20 min total, natural)
Just *talk* through these — unscripted, in your own words:
- How you got into visual direction; the director/muse thing and why the relationship is the work.
- A shoot that went sideways and what you learned.
- What "rooted in Blackness as authority" means to you (from your brand doc).
- Something that makes you laugh; something you're excited to build.
- Read 2–3 of your own IG captions the way you'd *say* them, not announce them.

### ElevenLabs settings (once cloned)
- **Professional Voice Clone** from the clean 15–30 min (not Instant, for the final).
- **Stability ~40–50%** (lower = more expressive/human; too high = flat/robotic).
- **Similarity ~80%**, **Style** low-to-moderate, **Speaker Boost ON**.
- Generate 2–3 takes; keep the one with natural rhythm. Leave a real breath/“uh” in the edit — imperfection reads as human.

---

## PART 2 — Talking video (for the HeyGen avatar)

You sent a solid 50s vertical clip — right idea, just needs to be longer and SDR.

### Specs
- **2–3 minutes**, one continuous take, **looking straight at the lens**.
- **1080p or 4K**, 30fps, **SDR not HDR** (turn OFF "HDR video" in iPhone camera settings —
  HDR/10-bit confuses avatar tools). Your 10s clip was HDR; the 50s was SDR ✓.
- **Even soft light on your face** (window light or a soft lamp), no harsh shadow.
- **Framing:** head-and-shoulders, centered, phone on a tripod/propped, stable.
- **Clean audio**, quiet room (this doubles as more voice material).
- Talk naturally with your normal expressions and hand movement — HeyGen learns your motion.

### What to say
Anything, as long as your mouth moves naturally for the full 2–3 min. Reuse the voice
topics above. Natural > scripted.

---

## PART 3 — Photos (for a REAL likeness)

From your local **AI CLONE** folder, curate toward what's currently thin (see
`REFERENCES.md` for the full spec). Priorities for realism:
- **COLOR, not B&W** — the model learns your true skin tone only from color. Pull 15–20 sharp color shots.
- **Hatless** shots showing your **4C mini-fro + taper** (the locked canonical hair).
- **Tight face close-ups**, sharp, varied light.
- **Just you** — crop out anyone else.
- **High-res** (short side ≥ 1024px, ideally larger).

Run the audit to find the winners automatically:
```bash
python3 scripts/audit-references.py "~/Documents/AI CLONE"
```
It flags low-res, B&W-heavy gaps (by count), duplicates, and which files to cull — so you
upload only the strongest 25–40.

---

## The realism finish (every render, both looks)
- **Upscale finals** through Topaz — adds real-camera micro-detail, the biggest single realism boost.
- Keep **natural skin texture** in every prompt ("visible pores, not retouched").
- Check the **5-point QC** (eyes, skin, teeth, hands, edges) — see `docs/photo-generation.md`.
- Leave small imperfections in voice + motion; perfection is what reads as fake.

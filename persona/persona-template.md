# Persona Bible — TEMPLATE

> Copy this file to `persona/persona.md` and fill in **every** field. The more specific
> and *repeatable* the language, the more consistent your clone stays across renders.
> Write descriptions a stranger could use to pick you out of a crowd — concrete nouns,
> not vibes. Reuse the *exact same wording* every time; consistency of language drives
> consistency of output.

---

## 1. Identity tag
A short, unique handle the model can anchor to. Use it verbatim in every prompt.

- **Persona name / tag:** e.g. `ISAAC_P` (use a token unlikely to collide with a celebrity)
- **One-line essence:** e.g. "early-30s NYC creative, warm, dry humor, always a little caffeinated"

## 2. Face (the most important section)
Be forensic. These are the features that must not drift.

- **Apparent age:**
- **Skin tone & undertone:** (e.g. light-medium, warm/olive undertone)
- **Face shape:** (oval / square / round / heart / oblong)
- **Distinguishing marks:** moles, freckles, scars, dimples — *location matters*
- **Eyes:** color, shape (almond/round/hooded), spacing, brow shape & thickness
- **Nose:** size, bridge (straight/curved), tip
- **Lips:** fullness, shape, resting expression
- **Cheeks / jaw / chin:** cheekbone prominence, jawline definition, chin shape
- **Teeth / smile:** (e.g. slight gap, bright, crooked left incisor)
- **Hair:** color, exact length, texture (straight/wavy/curly/coily), part, hairline, current cut
- **Facial hair:** style + length + how groomed (or clean-shaven)

## 3. Body & bearing
- **Height & build:** (e.g. 5'11", lean athletic)
- **Posture / energy:** (e.g. relaxed, leans on things, talks with hands)
- **Hands / notable details:**

## 4. Wardrobe (your visual signature)
List 3–5 repeatable "uniform" looks. Recurring wardrobe = instant recognizability.

- **Signature look A:** (e.g. faded black tee, vintage Levi's, white low-top sneakers, silver chain)
- **Signature look B:**
- **Signature look C:**
- **Always-on accessories:** glasses, watch, rings, earrings, hat
- **Color palette you live in:**

## 5. Voice (for ElevenLabs + dialogue)
- **Pitch / register:** (low / medium / high; warm / bright)
- **Pace & rhythm:** (fast and clipped / slow and deliberate / conversational with pauses)
- **Accent / region:**
- **Texture:** (smooth, raspy, breathy, nasal, gravelly)
- **Verbal tics & filler:** ("honestly," "right?", "I mean," "look—")
- **Catchphrases / sign-off:**
- **Reference audio file:** path to your 2–3 min clean sample (keep private, do not commit)

## 6. Mannerisms & "acting" (what makes it *act* like you)
- **Default facial expression at rest:**
- **When excited:** (eyebrows up, leans in, talks faster…)
- **When thinking:** (looks up-left, rubs chin…)
- **Gestures you always do:**
- **Laugh:** (silent shoulder shake / loud / quick exhale through nose)
- **Eye contact habit with camera:**

## 7. Personality & voice-of-content (for scripts/captions)
- **Tone:** (e.g. warm, self-deprecating, dry, optimistic)
- **Topics you talk about:**
- **Words/phrases you'd never say:**
- **POV & values:**

## 8. World & locations (your NYC)
Recurring real places make it feel like *your* life, not stock NYC.

- **Home base look:** (e.g. small sunlit Brooklyn apartment, plants, exposed brick)
- **Go-to neighborhoods:** (e.g. Williamsburg, LES, West Village, DUMBO)
- **Recurring spots:** (a specific coffee shop counter, a stoop, a rooftop, the subway platform)
- **Times of day you shoot:** (golden hour, blue hour, harsh noon, night neon)

## 9. Rights & disclosure (fill before publishing)
- [ ] This persona is **me**, or someone with **written consent**.
- [ ] Reference photos/voice are stored **privately** (not in this repo).
- [ ] Each published piece carries an **AI/synthetic label** (caption + metadata).
- [ ] No content makes deceptive claims (fake endorsement, news, financial/medical advice).
- [ ] I've checked the **disclosure rules** of each platform I post to.
- **Disclosure text I use:** e.g. "Made with AI · this is a synthetic clone of me"

---

### How the builder uses this
The prompt builder reads the **Identity tag**, **Face**, **Wardrobe**, **Voice**, and
**Mannerisms** sections to construct the persona layer of every prompt. Keep those tight.

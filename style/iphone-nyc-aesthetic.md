# The "Shot on iPhone in NYC" Look Bible

This is the **style layer** — the half of every prompt that makes content feel personal,
candid, and real instead of glossy or "AI." The goal is the texture of a clip a friend
filmed of you on their phone while you were walking around the city. Hyper-real ≠
cinematic. Hyper-real = *imperfect, handheld, true to life*.

Use these as concrete, copy-pasteable prompt ingredients. The prompt builder injects
them automatically; this file is the reference for *why* and the menu to tweak.

---

## The 6 pillars of "iPhone real"

### 1. The lens & camera (this is what reads as "phone")
- Shot on an **iPhone** (current model), **main wide camera**, ~**26mm equivalent**
- **Deep depth of field** — most of the frame in focus (phones don't naturally blur much).
  Avoid heavy bokeh; that reads as "cinema camera / AI."
- Slight **wide-angle distortion** up close; subject a touch closer than flattering
- **Vertical 9:16** for social-native; 4:3 or 16:9 for a "filmed by a friend" feel
- Tiny **lens smudge / flare**, faint chromatic aberration at edges

### 2. Handheld motion (kills the "AI float")
- **Handheld**, natural micro-shake, small reframing/corrections as if a person is holding it
- Walk-and-talk: gentle bob; the camera *hunts* slightly to keep you in frame
- NOT: gimbal-smooth glides, drone moves, perfect dolly. Those scream produced.
- Occasional **autofocus hunt / quick exposure shift** when light changes

### 3. Light — natural, available, unflattering-on-purpose
- **Available light only:** window light, overcast sky, sun bouncing off buildings, shade
- NYC specifics: **harsh midday sun + hard shadows** between buildings; **golden hour**
  raking down the avenues; **blue hour**; **neon/storefront/streetlight** mixed color at night
- Let it be **a little blown out** in the sky or **a little crushed** in shadows — real phones do
- Mixed white balance (warm tungsten + cool shade) is *good* — it reads real
- Avoid: studio softbox, ring light, perfect three-point lighting

### 4. The NYC of it (specific > generic)
- **Specific, lived-in places** beat "New York City skyline": a bodega counter, a subway
  platform, a brownstone stoop, a fire escape, a crowded crosswalk, a deli, a rooftop with
  water towers, the inside of an L train, a corner with steam from a manhole
- **Real background life:** passersby, traffic, pigeons, delivery bikes, scaffolding/sheds,
  trash bags, yellow cabs, steam, graffiti, street vendors
- **Weather & season** make it real: drizzle on the lens, summer haze, winter breath, wet
  reflective pavement
- Sound of the city (for tools with audio): distant sirens, traffic hum, chatter, a train

### 5. Skin & texture (the anti-AI details)
- **Real skin:** visible pores, slight oil/sweat sheen, flyaway hairs, minor blemishes,
  redness, stubble — *do not* smooth. Add "natural skin texture, not retouched."
- **Slightly imperfect framing:** subject off-center, head a little cropped sometimes
- **Authentic micro-expressions:** mid-blink, mid-word, a real half-smile, looking away

### 6. The "real footage" finish (capture artifacts)
- Light **digital noise/grain** in shadows; mild **HDR/over-sharpening** halo like a phone
- **Slightly compressed** look, faint motion blur on fast movement
- **Rolling-shutter** wobble on quick pans
- Optional UI realism in edit: timestamp, a thumb at frame edge, "filmed vertically"

---

## Drop-in prompt phrases

**Camera / format**
> shot on an iPhone, main wide 26mm lens, vertical 9:16, deep depth of field, everything mostly in focus, slight wide-angle distortion, faint lens flare and smudge

**Motion**
> handheld, natural camera shake, small reframing corrections, autofocus hunting, casual walk-and-talk, not gimbal-smooth

**Light**
> available natural light only, harsh midday NYC sun with hard shadows (OR golden hour OR neon night), mixed white balance, slightly blown highlights, no studio lighting

**Realism / skin**
> hyper-realistic, candid, natural skin texture with visible pores and minor imperfections, not retouched, authentic micro-expressions, slightly imperfect framing

**Footage feel**
> looks like real amateur iPhone footage, light sensor noise in shadows, mild HDR over-sharpening, slight compression, casual home-video energy

**Negative / avoid** (where supported)
> avoid: cinematic, glossy, studio lighting, shallow bokeh, gimbal-smooth motion, drone shot, plastic smooth skin, over-saturated, stock-footage look, perfect symmetry

---

## Time-of-day cheat sheet (NYC)

| Slot | Look | Best for |
|------|------|----------|
| **Early morning** | soft, empty streets, long shadows, mist | reflective, calm, "just me" content |
| **Harsh noon** | hard shadows, contrast, squinting, bright | candid energetic, street, comedy |
| **Golden hour** | warm rake down avenues, lens flare | flattering, aspirational, walk-and-talk |
| **Blue hour** | cool dusk, lights flicking on | moody, transitional |
| **Night** | neon, storefront glow, streetlights, grain | club/dinner/nightlife, intimate |

---

## The finishing pass (in your editor, after generation)

To bond a generated clip to the look, in CapCut/Premiere/Resolve:
1. Slight **handheld jitter** if the clip is too smooth (add subtle position keyframes)
2. **Grain** overlay (light), maybe a **VHS/phone-grain** texture at low opacity
3. Pull a touch of **contrast**, lift blacks slightly, warm or cool the grade to match NYC time-of-day
4. **Audio:** layer real NYC ambient room tone under it; keep your ElevenLabs VO slightly
   un-perfect (room reverb, a breath, a stumble)
5. **9:16 crop** with the action a little off-center
6. Add a discreet **AI/synthetic disclosure** label

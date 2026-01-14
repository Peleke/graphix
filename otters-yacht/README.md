# Midnight Charter - Graphic Novel Project

## Concept
A 7-panel romantic/explicit graphic novel spread:
- **Left page**: 6 panels, slow burn from meeting to intimacy
- **Right page**: Full-spread climax - smash cut to fully hilted, spraying everywhere

## Characters

### The Otter (shortstack)
- Tiny mature adult anthro otter woman
- 30s, milf energy
- Sleek brown fur, webbed paws, whiskers, round ears
- Athletic body, thicc hips, plump breasts
- Later revealed: has needy cock + heavy balls (futa)

### The Femboy (tall)
- Large tall feminine anthro femboy
- Dark olive skin, long raven black hair
- Big soft breasts (not huge), athletic build, thicc hips
- Heavy, HEAVY testicles - increasingly visible bulge → wet spot progression

## Panel Breakdown

### Panel 1 - The Boarding ✓ (generated)
*Sunset dock. Femboy extends hand to help tiny otter aboard yacht. She's in sundress, clutching bag, nervous but intrigued.*

**Best outputs**: `panel1_yih_v1_nohand.png`, `panel1_novafurry_v2_nohand.png`

---

### Panel 2 - Cheers ✓ (generated)
*Deck at dusk. Sitting across from each other, champagne glasses raised. City lights twinkling. Both still formal, but she's laughing. Ice breaking.*

**Best outputs**: `panel2_cheers_v1.png` - `panel2_cheers_v6.png` (skip v7/v8)

---

### Panel 3 - Sunset Watch (in progress)
*Standing at railing together, sky orange/pink. Pointing at horizon. Shoulders almost touching. Comfortable silence.*

**Progression**: First visible bulge in femboy's pants

**Prompt base**:
```
score_9, score_8_up, score_7_up, masterpiece, Colorful Line Art, LookDaal, (furry anthro otter:1.4),
graphic novel panel, 2characters, couple shot, tiny shortstack mature adult anthro otter woman in sundress
standing next to large tall feminine anthro femboy, extreme size difference, femboy wearing tight pants
with visible bulge, heavy balls outline visible, big soft breasts on femboy, both at yacht railing,
sunset, romantic tension, clothed
```

---

### Panel 4 - Getting Closer (TODO)
*Interior, cozy cabin seating. Plush couch, shoes off. She's tucked legs up, turned toward him. He's leaning in. Deep conversation. Eye contact lingering.*

**Progression**: More obvious bulge, maybe slight wet spot starting

**Prompt base**:
```
score_9, score_8_up, score_7_up, masterpiece, Colorful Line Art, LookDaal, (furry anthro otter:1.4),
graphic novel panel, 2characters, intimate scene, tiny shortstack mature anthro otter woman curled up
on plush couch, legs tucked, turned toward large tall feminine anthro femboy, femboy leaning in close,
elbow on couch back, deep eye contact, yacht cabin interior, warm lighting, cozy atmosphere,
femboy pants with prominent bulge, damp spot forming on fabric, heavy balls straining, big breasts,
both clothed, romantic tension building, falling for each other
```

---

### Panel 5 - The Lean (TODO)
*Same couch, later. Bottle mostly empty. She's leaning against his side, his arm over her shoulders. Eyes half-closed, content smile. Thumb tracing circles on her arm.*

**Progression**: Obvious wet spot, she's definitely noticed

**Prompt base**:
```
score_9, score_8_up, score_7_up, masterpiece, Colorful Line Art, LookDaal, (furry anthro otter:1.4),
graphic novel panel, 2characters, cuddling couple, tiny shortstack mature anthro otter woman leaning
against large tall feminine anthro femboy, his arm draped over her shoulders, her eyes half-closed
content smile, his thumb tracing circles on her arm, empty champagne bottle, yacht cabin couch,
femboy pants with very obvious wet spot, precum stain spreading, thick bulge, heavy swollen balls,
big breasts, intimate but still clothed, she's glancing at the bulge, tension thick
```

---

### Panel 6 - The Look (TODO)
*Close-up. Her chin tilted up, looking at him. His face angled down. Inches apart. Moment right before first kiss. Soft lighting. Tender.*

**Progression**: The inhale before the explosion

**Prompt base**:
```
score_9, score_8_up, score_7_up, masterpiece, Colorful Line Art, LookDaal, (furry anthro otter:1.4),
graphic novel panel, close up shot, 2characters, faces close, tiny shortstack mature anthro otter woman
chin tilted up gazing at large tall feminine anthro femboy, his face angled down toward hers,
inches apart, about to kiss, soft lighting, tender moment, romantic, extreme size difference visible,
yacht cabin, warm glow, the moment before everything changes
```

---

### Right Page - Full Spread: "Release" (reference exists)
*SMASH CUT: Otter fully hilted on femboy's cock, legs wrapped, ahegao maximum, her own cock spraying ropes everywhere, both wrecked, covered in cum, drunk and fucked stupid.*

**Reference images**: `otter_futa_yacht_v5.png` and similar

**Prompt base**:
```
score_9, score_8_up, score_7_up, score_6_up, source_anime, rating_explicit, colorful line art,
masterpiece, 1futanari, 1femboy, extreme size difference, tiny mature shortstack anthro otter futanari,
anthro, furry, sleek wet fur, webbed paws, whiskers, round ears, plump breasts, round tits,
needy erect cock, throbbing penis, heavy balls, swollen testicles, athletic body, thicc hips,
large tall femboy, femboy with small breasts, modest chest, huge balls, athletic build,
dark olive skin, long raven black hair, brown sleek fur, both completely nude,
luxury yacht bedroom, ocean view, silk sheets, nighttime, tight embrace, hugging close,
femboy cock buried to the root inside her, hilted balls deep, bottomed out, pelvis to pelvis,
shortstack cumming hard hands free, ejaculating from being fucked, getting the nut fucked out of her,
cum spraying from her cock, dual orgasm, sitting in lap, legs wrapped around waist, facing each other,
both visibly drunk, wasted, peeing, extreme ahegao, spiral eyes, tongue out, drooling, fucked stupid
```

**LoRAs for climax**: `betterahegao.safetensors`, `Excessive_transparent_pre-cum.safetensors`, `Futa_on_Female_illustrious-000053.safetensors`

---

## Technical Notes

### Models that work
- **yiffInHell_yihXXXTended.safetensors** - Best overall
- **novaFurryXL_ilV130.safetensors** - Good, occasional hand issues
- **illustriousNSFWFrom_gammaUpdate.safetensors** - Good with LoRAs

### LoRAs tested
| LoRA | Trigger | Notes |
|------|---------|-------|
| Eleptors_Anthro_Furry_Lora_Illustrious_V2 | `(furry anthro (species):1.4)` | Good anthro, can overpower composition |
| colorful_line_art_illustriousXL | `Colorful Line Art` or `Colorful_Line_Art` | Great linework |
| the-look-illustriousXL | `LookDaal` | Good gaze/expression, use early |
| DetailerILv2-000008 | - | Detail boost, use last at strength 1 |
| PosingDynamicsILL | - | Better poses |
| Furry_Babes_-_Illustrious_Artstyle | `furrXXXy` | Different style |
| Furry_femboy_style | `furry_femboy_style` | Femboy focus |

### Negative prompts that help
```
young, child, childlike, loli, teen, teenager, underage, baby face, juvenile, immature
human hand, white hand, human skin, disembodied hand, floating hand
text, words, letters, writing, caption, dialogue, speech bubble, watermark
single character, solo, one person (when doing couple shots)
flat crotch, no bulge (when bulge needed)
```

### Settings
- Resolution: 768x1024 (portrait panels)
- Steps: 40
- CFG: 1.8-2.5
- Sampler: euler_ancestral

---

## Future Workflow Ideas
See: `comfyui-mcp/.serena/memories/graphic-novel-workflow-ideas.md`

- `/storyboard` skill for managing panel sequences
- `/character` skill for consistent character profiles
- IP-Adapter for character consistency across panels
- LoRA training on best outputs for character lock
- Panel layout/composition tool (Python + PIL)
- Tarot style LoRA for final unified look

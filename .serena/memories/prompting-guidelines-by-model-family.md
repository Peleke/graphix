# Prompting Guidelines by Model Family

## Overview
Synthesized from research on Civitai, HuggingFace, and community guides (Jan 2026).

---

## Pony Diffusion (yiffInHell, yiffyMix, etc.)

### Prompt Structure
```
[score_tags], [source_tag], [rating_tag], [character_count], [species], 
[physical_traits], [action/pose], [setting], [lighting], [style_tags]
```

### Required Tags
- **Score tags** (REQUIRED at start): `score_9, score_8_up, score_7_up, score_6_up`
- **Source tags**: `source_furry`, `source_anime`, `source_cartoon`, `source_pony`
- **Rating tags**: `rating_safe`, `rating_questionable`, `rating_explicit`

### Settings
- CFG: 6-8 (7 recommended)
- Steps: 25-30
- Sampler: Euler A / euler_ancestral
- CLIP Skip: -2 (CRITICAL)
- Resolution: 1024x1024 or SDXL standards

### NSFW Tag Vocabulary (e621/booru style)
**Actions:**
- `oral, fellatio, cunnilingus, blowjob, deepthroat`
- `sex, penetration, vaginal_penetration, anal_penetration`
- `handjob, masturbation, mutual_masturbation, fingering`
- `licking, kissing, grinding, humping`

**Body Parts:**
- `breasts, large_breasts, huge_breasts, nipples, areolae`
- `penis, erection, balls, sheath, knot`
- `pussy, vulva, clit, spread_pussy`
- `ass, anus, presenting, spread_ass`
- `tongue, tongue_out, long_tongue`

**Fluids:**
- `cum, cum_in_mouth, cum_on_face, cum_on_body, cum_inside`
- `cum_drip, excessive_cum, cum_string, cum_pool`
- `saliva, drool, saliva_string, wet`
- `precum, precum_drip`

**Poses:**
- `on_back, on_stomach, on_side, on_all_fours`
- `doggy_style, cowgirl_position, missionary, reverse_cowgirl`
- `from_behind, spread_legs, legs_up, kneeling`
- `presenting, presenting_hindquarters, lordosis`

**Expressions:**
- `ahegao, fucked_silly, rolling_eyes, cross-eyed`
- `open_mouth, tongue_out, drooling, panting`
- `blush, heavy_blush, flushed, lustful`
- `half-closed_eyes, bedroom_eyes, seductive`
- `pleasure, orgasm, climax, enjoying`

**Size/Physique:**
- `muscular, bara, fit, toned, chubby, thicc`
- `size_difference, height_difference`
- `anthro, anthropomorphic, furry`

### Negative Prompt
```
score_4, score_3, score_2, score_1, worst quality, low quality, 
blurry, jpeg artifacts, watermark, signature, text, human, 
bad anatomy, deformed, ugly, extra limbs
```

### Example Prompts

**Explicit Furry (2 females):**
```
score_9, score_8_up, score_7_up, source_furry, rating_explicit,
2girls, female anthro otters, lesbian, mutual_masturbation, fingering,
both naked, large_breasts, nipples, pussy, spread_legs,
happy expressions, blushing, half-closed_eyes, pleasure,
cozy living room, couch, warm lighting, detailed fur, anime style
```

**Explicit Furry (M/F oral):**
```
score_9, score_8_up, score_7_up, source_furry, rating_explicit,
1boy, 1girl, anthro otter, size_difference, fellatio, oral, blowjob,
male standing muscular, female kneeling petite, penis_in_mouth,
looking_up_at_viewer, hands_on_thighs, eager expression,
yacht cabin interior, skylight, warm lighting, detailed fur
```

**Explicit cumshot:**
```
score_9, score_8_up, score_7_up, source_furry, rating_explicit,
1boy, 1girl, anthro, facial, cum_on_face, cum_in_mouth, cum_drip,
tongue_out, open_mouth, catching_cum, happy, blush, messy,
close-up, detailed fur, warm lighting
```

---

## Illustrious XL (NoobAI, WAI, prefect, etc.)

### Prompt Structure
```
[quality_tags], [character_count], [character_details], 
[pose/action], [setting], [lighting], [style_tags]
```

### Quality Tags (at start)
- `masterpiece, best quality, absurdres, newest`
- Alternative: `amazing quality, very aesthetic`

### Key Differences from Pony
- NO score tags (model doesn't understand them)
- Uses danbooru tags (lowercase, comma-separated)
- More sensitive to negative prompts
- Better at backgrounds and text
- 248 token limit (vs 75 for base SDXL)

### Tag Format
- Lowercase: `masterpiece` not `Masterpiece`
- Underscores optional: `open_mouth` or `open mouth`
- Character counts: `1girl, 2girls, 1boy` (not "woman, man")

### Settings
- CFG: 4.5-7.5 (5.5 optimal)
- Steps: 20-28 (24 ideal)
- Sampler: Euler A
- Resolution: Up to 1536x1536 for v1.0+

### Negative Prompt
```
lowres, (bad), bad anatomy, bad hands, extra digits, multiple views,
fewer, extra, missing, text, error, worst quality, jpeg artifacts,
low quality, watermark, unfinished, displeasing, oldest, early,
chromatic aberration, signature, artistic error, username, scan
```

### Avoid These Tags
- `score_9, score_8` (Pony-specific)
- `8k, 4k, hdr` (not danbooru tags)
- `high quality, detailed` (not actual tags)

---

## Flux (schnell, dev)

### Prompt Structure
Natural language works best. More conversational than tag-based.

### Settings
- CFG: 1-2 (very low!)
- Steps: 4 (schnell) or 20-30 (dev)
- Resolution: Flexible

### Style
- Write descriptive sentences
- Can include artistic style references
- Works well with detailed scene descriptions

---

## General NSFW Guidelines

### Intensity Scaling
1. **Suggestive**: clothed, teasing poses, implied
2. **Questionable**: partial nudity, underwear, suggestive poses
3. **Explicit**: full nudity, sexual acts, fluids

### Character Consistency
- Describe species clearly: `anthro sea otter, brown fur`
- Include distinguishing features: `red hair, spotted fur, muscular`
- Use character names if established: `Ruby, Hazel`

### Composition Tags
- `close-up, medium_shot, wide_shot, full_body`
- `from_above, from_below, from_behind, from_side`
- `pov, first_person_view`

### Lighting for Mood
- Intimate: `warm lighting, soft shadows, candlelight`
- Dramatic: `rim lighting, backlighting, dramatic shadows`
- Romantic: `golden hour, sunset, soft glow`

---

## Sources
- [Civitai: Tips for Illustrious XL Prompting](https://civitai.com/articles/8380)
- [Civitai: Pony V6 XL Prompting Resources](https://civitai.com/articles/4871)
- [Civitai: Illustrious Prompting Guide v0.1](https://civitai.com/articles/10962)
- [HuggingFace: Pony Diffusion V6 XL](https://huggingface.co/LyliaEngine/Pony_Diffusion_V6_XL)
- [Apatero: Booru Tags Guide 2025](https://apatero.com/blog/what-are-booru-tags-complete-guide-2025)

# Phase 3.5 UAT - NSFW Test Scenarios

## Scenario: "Stress Relief" - Otter Solo Scene Storyboard

**Premise:** Tired otter comes home from work, drinks, masturbates to relieve stress, and passes out.
A 6-panel sequence demonstrating Phase 3.5 features for adult solo content.

---

## Setup

### Project & Character

```json
// Create project
{
  "tool": "project_create",
  "args": {
    "name": "Stress Relief One-Shot",
    "description": "Solo NSFW scene - exhausted otter after work",
    "settings": {
      "defaultModel": "ponyDiffusion_v6.safetensors",
      "defaultNegative": "bad anatomy, deformed, blurry, watermark"
    }
  }
}
// Returns: { "id": "proj-otter-001", ... }

// Create character
{
  "tool": "character_create",
  "args": {
    "projectId": "proj-otter-001",
    "name": "Mira",
    "species": "otter",
    "description": "Female river otter, office worker, brown fur with cream underbelly, tired eyes, business casual",
    "appearance": {
      "species": "otter",
      "bodyType": "curvy",
      "furColor": "brown with cream underbelly",
      "eyeColor": "amber",
      "distinguishingFeatures": "small scar on left ear, always looks exhausted"
    },
    "promptTags": ["female otter", "anthro otter", "brown fur", "cream underbelly", "amber eyes", "curvy"]
  }
}
// Returns: { "id": "char-mira-001", ... }

// Create storyboard
{
  "tool": "storyboard_create",
  "args": {
    "projectId": "proj-otter-001",
    "name": "After Work Release",
    "description": "Mira comes home exhausted, drinks, masturbates, passes out"
  }
}
// Returns: { "id": "sb-stress-001", ... }
```

---

## Panel 1: Coming Home Dead Tired

### Set Lighting (3.5.6)

```json
{
  "tool": "lighting_suggest",
  "args": {
    "sceneDescription": "apartment entrance at night, single overhead light, tired mood"
  }
}
// Returns suggestion...

{
  "tool": "storyboard_set_lighting",
  "args": {
    "storyboardId": "sb-stress-001",
    "config": {
      "primarySource": {
        "type": "artificial",
        "direction": "top",
        "intensity": 0.4,
        "color": "#FFF5DC"
      },
      "ambientColor": "#1a1a2e",
      "timeOfDay": "night"
    }
  }
}
```

### Create Panel

```json
{
  "tool": "panel_create",
  "args": {
    "storyboardId": "sb-stress-001",
    "position": 1,
    "description": "Mira stumbles through her apartment door, briefcase dropping, exhausted expression, still in work clothes"
  }
}
// Returns: { "id": "panel-001", ... }
```

### Check Past Successes (3.5.5)

```json
{
  "tool": "generation_suggest_params",
  "args": {
    "projectId": "proj-otter-001",
    "prompt": "female otter, exhausted, coming home, apartment"
  }
}
// Returns recommended settings based on any past project data
```

### Generate & Curate (3.5.4)

```json
{
  "tool": "panel_generate_variants",
  "args": {
    "panelId": "panel-001",
    "count": 4,
    "prompt": "female otter, anthro, brown fur, cream underbelly, exhausted expression, tired eyes, coming home from work, apartment doorway, dropping briefcase, business casual clothes, dim lighting, nighttime",
    "negativePrompt": "happy, energetic, nude, nsfw"
  }
}

// Compare and rate
{
  "tool": "generation_compare",
  "args": { "panelId": "panel-001" }
}

{
  "tool": "generation_batch_rate",
  "args": {
    "ratings": [
      { "imageId": "gen-p1-001", "rating": 4 },
      { "imageId": "gen-p1-002", "rating": 5 },
      { "imageId": "gen-p1-003", "rating": 3 },
      { "imageId": "gen-p1-004", "rating": 3 }
    ]
  }
}

{
  "tool": "generation_quick_select",
  "args": { "panelId": "panel-001", "criteria": "highest_rating" }
}
```

### Save Expression (3.5.1)

```json
{
  "tool": "expression_save",
  "args": {
    "characterId": "char-mira-001",
    "sourceGenerationId": "gen-p1-002",
    "name": "exhausted",
    "description": "Dead tired after work, droopy eyelids, slight frown",
    "tags": ["tired", "exhausted", "work", "stress"]
  }
}
```

---

## Panel 2: Pouring a Drink

### Create Panel

```json
{
  "tool": "panel_create",
  "args": {
    "storyboardId": "sb-stress-001",
    "position": 2,
    "description": "Mira in kitchen, pouring whiskey, work shirt partially unbuttoned, shoes kicked off"
  }
}
```

### Generate

```json
{
  "tool": "panel_generate_variants",
  "args": {
    "panelId": "panel-002",
    "count": 4,
    "prompt": "female otter, anthro, brown fur, in kitchen, pouring whiskey into glass, work shirt unbuttoned, barefoot, tired but determined expression, dim kitchen lighting, nighttime",
    "negativePrompt": "happy, nude"
  }
}
```

### Quick Curation

```json
{
  "tool": "generation_batch_rate",
  "args": {
    "ratings": [
      { "imageId": "gen-p2-001", "rating": 4 },
      { "imageId": "gen-p2-002", "rating": 3 },
      { "imageId": "gen-p2-003", "rating": 5 },
      { "imageId": "gen-p2-004", "rating": 4 }
    ]
  }
}

{
  "tool": "panel_select_output",
  "args": { "panelId": "panel-002", "generationId": "gen-p2-003" }
}
```

---

## Panel 3: On the Couch, Getting Comfortable

### Create Panel

```json
{
  "tool": "panel_create",
  "args": {
    "storyboardId": "sb-stress-001",
    "position": 3,
    "description": "Mira sprawled on couch, drink in hand, work clothes mostly off, starting to relax"
  }
}
```

### Extract Pose from Reference (if you have one) (3.5.1)

```json
// If we have a reference image with a good sprawled pose
{
  "tool": "pose_extract",
  "args": {
    "imagePath": "/references/sprawled_couch_pose.png",
    "outputPath": "/output/poses/sprawled_couch.png"
  }
}

{
  "tool": "pose_save",
  "args": {
    "projectId": "proj-otter-001",
    "imagePath": "/output/poses/sprawled_couch.png",
    "category": "lying",
    "tags": ["couch", "sprawled", "relaxed", "solo"],
    "description": "Sprawled on couch, one arm up, legs apart"
  }
}
```

### Generate with Suggestive Content

```json
{
  "tool": "panel_generate_variants",
  "args": {
    "panelId": "panel-003",
    "count": 4,
    "prompt": "female otter, anthro, brown fur, cream underbelly, sprawled on couch, holding whiskey glass, work shirt open, bra visible, skirt hiked up, panties visible, relaxed expression, slightly tipsy, dim living room, nighttime",
    "negativePrompt": "nude, explicit, masturbating"
  }
}
```

### Save Good Pose (3.5.1)

```json
{
  "tool": "pose_extract_and_save",
  "args": {
    "generationId": "gen-p3-002",
    "projectId": "proj-otter-001",
    "category": "lying",
    "tags": ["couch", "sprawled", "tipsy", "suggestive"],
    "description": "Tipsy sprawl on couch - good for solo scenes"
  }
}
```

---

## Panel 4: Starting to Touch (Explicit)

### Update Lighting for Mood

```json
{
  "tool": "storyboard_set_lighting",
  "args": {
    "storyboardId": "sb-stress-001",
    "config": {
      "primarySource": {
        "type": "artificial",
        "direction": "side",
        "intensity": 0.3,
        "color": "#FFD700"
      },
      "secondarySource": {
        "type": "ambient",
        "direction": "front",
        "intensity": 0.2,
        "color": "#4169E1"
      },
      "ambientColor": "#0d0d1a",
      "timeOfDay": "night"
    }
  }
}
```

### Create Panel

```json
{
  "tool": "panel_create",
  "args": {
    "storyboardId": "sb-stress-001",
    "position": 4,
    "description": "Mira touching herself through panties, drink set aside, eyes half-closed, building pleasure"
  }
}
```

### Generate Explicit Content

```json
{
  "tool": "panel_generate_variants",
  "args": {
    "panelId": "panel-004",
    "count": 6,
    "prompt": "female otter, anthro, brown fur, cream underbelly, lying on couch, masturbating, touching pussy through panties, hand in panties, work shirt open, bra pushed up, small breasts exposed, half-lidded eyes, pleasure expression, blushing, panting, whiskey glass nearby, dim moody lighting, explicit, nsfw",
    "negativePrompt": "male, penis, penetration, toy"
  }
}
```

### Curate Best Variants (3.5.4)

```json
{
  "tool": "generation_compare",
  "args": { "panelId": "panel-004" }
}

{
  "tool": "generation_batch_rate",
  "args": {
    "ratings": [
      { "imageId": "gen-p4-001", "rating": 3 },
      { "imageId": "gen-p4-002", "rating": 5 },
      { "imageId": "gen-p4-003", "rating": 4 },
      { "imageId": "gen-p4-004", "rating": 4 },
      { "imageId": "gen-p4-005", "rating": 5 },
      { "imageId": "gen-p4-006", "rating": 3 }
    ]
  }
}

// Favorite the best ones
{
  "tool": "generation_batch_favorite",
  "args": {
    "imageIds": ["gen-p4-002", "gen-p4-005"],
    "favorite": true
  }
}
```

### Fix Hands if Needed (3.5.2)

```json
// Create mask for hand area
{
  "tool": "panel_create_mask",
  "args": {
    "imagePath": "/output/gen-p4-002.png",
    "preset": "hands",
    "outputPath": "/output/masks/p4_hands_mask.png"
  }
}

// Inpaint better hands
{
  "tool": "panel_inpaint",
  "args": {
    "panelId": "panel-004",
    "maskPath": "/output/masks/p4_hands_mask.png",
    "prompt": "detailed paw, fingers touching through fabric, panties, masturbating",
    "denoisingStrength": 0.55,
    "outputPath": "/output/gen-p4-002_fixed.png"
  }
}
```

### Save Pleasure Expression (3.5.1)

```json
{
  "tool": "expression_save",
  "args": {
    "characterId": "char-mira-001",
    "sourceGenerationId": "gen-p4-002",
    "name": "building_pleasure",
    "description": "Half-lidded eyes, slight open mouth, blushing, building toward climax",
    "intensity": 0.6,
    "tags": ["pleasure", "masturbation", "building", "nsfw"]
  }
}
```

---

## Panel 5: Climax / Squirting

### Create Panel

```json
{
  "tool": "panel_create",
  "args": {
    "storyboardId": "sb-stress-001",
    "position": 5,
    "description": "Mira at climax, squirting, back arched, mouth open in ecstasy, stress releasing"
  }
}
```

### Generate Climax Scene

```json
{
  "tool": "panel_generate_variants",
  "args": {
    "panelId": "panel-005",
    "count": 8,
    "prompt": "female otter, anthro, brown fur, cream underbelly, orgasm, squirting, female ejaculation, pussy juice spraying, back arched, head thrown back, mouth open, ahegao, tongue out, eyes rolling back, fingers in pussy, panties pulled aside, legs spread wide, couch, wet spot, intense pleasure, climax, explicit, nsfw",
    "negativePrompt": "male, penis, calm, clothed"
  }
}
```

### Heavy Curation for Best Climax Shot (3.5.4)

```json
{
  "tool": "generation_compare",
  "args": { "panelId": "panel-005" }
}

// Rate all 8
{
  "tool": "generation_batch_rate",
  "args": {
    "ratings": [
      { "imageId": "gen-p5-001", "rating": 3 },
      { "imageId": "gen-p5-002", "rating": 4 },
      { "imageId": "gen-p5-003", "rating": 5 },
      { "imageId": "gen-p5-004", "rating": 4 },
      { "imageId": "gen-p5-005", "rating": 5 },
      { "imageId": "gen-p5-006", "rating": 3 },
      { "imageId": "gen-p5-007", "rating": 4 },
      { "imageId": "gen-p5-008", "rating": 2 }
    ]
  }
}

// Get stats to see patterns
{
  "tool": "generation_stats",
  "args": {
    "imageIds": ["gen-p5-001", "gen-p5-002", "gen-p5-003", "gen-p5-004", "gen-p5-005", "gen-p5-006", "gen-p5-007", "gen-p5-008"]
  }
}
// See which seeds/cfgs produced the 5-star results
```

### Save Climax Expression (3.5.1)

```json
{
  "tool": "expression_save",
  "args": {
    "characterId": "char-mira-001",
    "sourceGenerationId": "gen-p5-003",
    "name": "orgasm_ahegao",
    "description": "Full ahegao orgasm face - eyes rolled back, tongue out, drooling",
    "intensity": 1.0,
    "tags": ["orgasm", "ahegao", "climax", "squirt", "nsfw"]
  }
}
```

### Save Climax Pose (3.5.1)

```json
{
  "tool": "pose_extract_and_save",
  "args": {
    "generationId": "gen-p5-003",
    "projectId": "proj-otter-001",
    "category": "lying",
    "tags": ["orgasm", "climax", "arched_back", "spread_legs", "solo", "nsfw"],
    "description": "Back arched climax pose - good for solo squirt scenes"
  }
}
```

---

## Panel 6: Passed Out Afterglow

### Create Panel

```json
{
  "tool": "panel_create",
  "args": {
    "storyboardId": "sb-stress-001",
    "position": 6,
    "description": "Mira passed out on couch, satisfied smile, wet mess everywhere, empty glass nearby"
  }
}
```

### Adjust Lighting for Aftermath

```json
{
  "tool": "storyboard_set_lighting",
  "args": {
    "storyboardId": "sb-stress-001",
    "config": {
      "primarySource": {
        "type": "artificial",
        "direction": "side",
        "intensity": 0.2,
        "color": "#E6E6FA"
      },
      "ambientColor": "#0a0a14",
      "timeOfDay": "night"
    }
  }
}
```

### Generate Passed Out Scene

```json
{
  "tool": "panel_generate_variants",
  "args": {
    "panelId": "panel-006",
    "count": 4,
    "prompt": "female otter, anthro, brown fur, passed out, sleeping, satisfied smile, afterglow, sprawled on couch, messy, wet spots on couch and thighs, cum stains, pussy juice dried, shirt open, exposed, empty whiskey glass, peaceful expression, dim lighting, nighttime, nsfw",
    "negativePrompt": "awake, alert, clean"
  }
}

{
  "tool": "generation_quick_select",
  "args": { "panelId": "panel-006", "criteria": "highest_rating" }
}
```

### Save Satisfied Expression (3.5.1)

```json
{
  "tool": "expression_save",
  "args": {
    "characterId": "char-mira-001",
    "sourceGenerationId": "gen-p6-002",
    "name": "satisfied_sleep",
    "description": "Peaceful sleeping face with satisfied smile after orgasm",
    "intensity": 0.2,
    "tags": ["sleeping", "satisfied", "afterglow", "peaceful", "nsfw"]
  }
}
```

---

## Bonus: Animate the Climax (3.5.3)

### Interpolate Between Panel 4 and Panel 5

```json
// Get suggestion for smooth animation
{
  "tool": "interpolation_suggest_count",
  "args": {
    "panelAPosition": 4,
    "panelBPosition": 5,
    "framesPerSecond": 8,
    "durationSeconds": 1.5
  }
}
// Returns: { suggestedCount: 12 }

// Generate the buildup-to-climax animation frames
{
  "tool": "panel_interpolate",
  "args": {
    "panelAId": "panel-004",
    "panelBId": "panel-005",
    "count": 12,
    "outputDir": "/output/animation/climax_sequence",
    "maintainIdentity": true,
    "blendPose": true,
    "easing": "ease-in",
    "prompt": "female otter, masturbating, building to orgasm, pleasure increasing"
  }
}
// Generates 12 frames showing progression from touching to climax!
```

---

## Final Analysis (3.5.5)

### What Worked Best?

```json
{
  "tool": "generation_analyze",
  "args": {
    "projectId": "proj-otter-001",
    "minRating": 4
  }
}
// Returns:
// {
//   "patterns": [
//     { "category": "prompt_term", "value": "ahegao", "avgRating": 4.8, "successRate": 0.9 },
//     { "category": "prompt_term", "value": "squirting", "avgRating": 4.5, "successRate": 0.75 },
//     { "category": "cfg", "value": "7", "avgRating": 4.6, "successRate": 0.8 },
//     { "category": "sampler", "value": "euler_ancestral", "avgRating": 4.5, "successRate": 0.85 }
//   ],
//   "recommendations": [
//     "ahegao expressions consistently rate well - use for climax scenes",
//     "CFG 7 produces best results for this character",
//     "Lower lighting intensity (0.2-0.4) works well for intimate scenes"
//   ],
//   "bestSettings": {
//     "model": "ponyDiffusion_v6.safetensors",
//     "cfg": 7,
//     "sampler": "euler_ancestral",
//     "topPromptTerms": ["ahegao", "squirting", "cream underbelly", "amber eyes"]
//   }
// }
```

### Find Similar Past Successes

```json
{
  "tool": "generation_find_similar",
  "args": {
    "prompt": "female otter orgasm squirting",
    "projectId": "proj-otter-001",
    "minRating": 4,
    "limit": 5
  }
}
// Returns top 5 similar successful generations to reference
```

---

## Expression Library After This Session (3.5.1)

```json
{
  "tool": "expression_list",
  "args": { "characterId": "char-mira-001" }
}
// Returns:
// [
//   { "name": "exhausted", "intensity": null, "tags": ["tired", "exhausted", "work", "stress"] },
//   { "name": "building_pleasure", "intensity": 0.6, "tags": ["pleasure", "masturbation", "building", "nsfw"] },
//   { "name": "orgasm_ahegao", "intensity": 1.0, "tags": ["orgasm", "ahegao", "climax", "squirt", "nsfw"] },
//   { "name": "satisfied_sleep", "intensity": 0.2, "tags": ["sleeping", "satisfied", "afterglow", "peaceful", "nsfw"] }
// ]
```

## Pose Library After This Session (3.5.1)

```json
{
  "tool": "pose_list",
  "args": { "projectId": "proj-otter-001" }
}
// Returns:
// [
//   { "category": "lying", "tags": ["couch", "sprawled", "tipsy", "suggestive"], "description": "Tipsy sprawl on couch" },
//   { "category": "lying", "tags": ["orgasm", "climax", "arched_back", "spread_legs", "solo", "nsfw"], "description": "Back arched climax pose" }
// ]
```

---

## Summary: Features Demonstrated

| Feature | Used For |
|---------|----------|
| **3.5.1 Pose Library** | Saved sprawl pose, climax pose |
| **3.5.1 Expression Library** | Saved exhausted, pleasure, orgasm, satisfied expressions |
| **3.5.2 Inpainting** | Fixed hands in masturbation panel |
| **3.5.3 Interpolation** | Created climax animation sequence |
| **3.5.4 Curation** | Batch rated, compared, quick-selected best variants |
| **3.5.5 Analytics** | Analyzed patterns, found what works for otter character |
| **3.5.6 Lighting** | Set moody night lighting, adjusted for climax scene |

This scenario demonstrates a complete adult content workflow using all Phase 3.5 features to create a polished 6-panel NSFW storyboard with animation potential.

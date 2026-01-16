# Phase 3.5 UAT - Comprehensive Test Matrix & Demo Scenario

## Overview

This document provides a complete User Acceptance Test plan for Phase 3.5 features, including:
1. **Test Matrix** - All features, tools, and verification criteria
2. **End-to-End Scenario** - Realistic workflow using all features together
3. **MCP Tool Command Examples** - Copy-paste ready for testing

---

## Test Matrix

### 3.5.1 Pose & Expression Libraries

| Tool | Test Case | Input | Expected Output | Verification |
|------|-----------|-------|-----------------|--------------|
| `pose_extract` | Extract pose from generation | `generationId`, `outputPath` | OpenPose skeleton image | File exists, valid PNG |
| `pose_save` | Save extracted pose to library | `projectId`, `imagePath`, `category`, `tags` | PoseLibraryEntry record | DB record created |
| `pose_extract_and_save` | Combined extract + save | `generationId`, `projectId`, `category` | Pose extracted and saved | Both skeleton file and DB record |
| `pose_list` | List poses by category | `projectId`, `category: "standing"` | Array of poses | Filtered correctly |
| `pose_get` | Get pose details | `poseId` | Full pose record | Includes imagePath, keypoints |
| `pose_update` | Update pose metadata | `poseId`, `tags: ["hero", "dynamic"]` | Updated record | Tags persisted |
| `pose_delete` | Remove pose | `poseId` | Success confirmation | Record removed from DB |
| `pose_list_categories` | Get all categories | None | Category list | Returns all POSE_CATEGORIES |
| `expression_save` | Save expression for character | `characterId`, `imagePath`, `name: "happy"` | ExpressionLibraryEntry | Linked to character |
| `expression_list` | List character expressions | `characterId` | Array of expressions | Character-scoped |
| `expression_get` | Get expression details | `expressionId` | Full expression record | Includes face region data |
| `expression_get_by_name` | Get by name | `characterId`, `name: "angry"` | Expression record | Name lookup works |
| `expression_update` | Update expression | `expressionId`, `intensity: 0.8` | Updated record | Intensity saved |
| `expression_delete` | Remove expression | `expressionId` | Success | Record removed |
| `expression_list_common` | Get common expression names | None | Expression names | Returns EXPRESSION_NAMES |

### 3.5.2 Smart Inpainting

| Tool | Test Case | Input | Expected Output | Verification |
|------|-----------|-------|-----------------|--------------|
| `panel_inpaint` | Inpaint region with mask | `panelId`, `maskPath`, `prompt`, `outputPath` | New generation | Inpainted area matches prompt |
| `panel_edit` | Text-based edit (InstructPix2Pix) | `panelId`, `instruction: "make the eyes blue"` | Edited image | Eyes changed color |
| `panel_create_mask` | Generate mask from preset | `imagePath`, `preset: "hands"`, `outputPath` | Mask image | White regions on hands |
| `inpaint_list_presets` | List mask presets | None | Preset list | Includes hands, face, background |

**Mask Presets to Verify:**
- `hands` - Both hands detected
- `left_hand` / `right_hand` - Individual hands
- `face` - Face region
- `eyes` - Eye regions only
- `background` - Everything except foreground subject
- `foreground` - Subject only

### 3.5.3 Panel Interpolation

| Tool | Test Case | Input | Expected Output | Verification |
|------|-----------|-------|-----------------|--------------|
| `panel_interpolate` | Generate in-betweens | `panelAId`, `panelBId`, `count: 3`, `outputDir` | 3 interpolated panels | Smooth transition A→B |
| `panel_interpolate` | With identity preservation | Above + `maintainIdentity: true` | Panels with consistent character | IP-Adapter applied |
| `panel_interpolate` | With pose blending | Above + `blendPose: true` | Pose-guided interpolation | ControlNet OpenPose used |
| `panel_interpolate` | Custom easing | Above + `easing: "ease-in-out"` | Non-linear timing | Middle frames closer together |
| `interpolation_suggest_count` | Get frame suggestion | `panelAPosition: 1`, `panelBPosition: 5` | Suggested count | Reasonable number (4-24) |

**Easing Functions to Verify:**
- `linear` - Even spacing
- `ease-in` - Slow start, fast end
- `ease-out` - Fast start, slow end
- `ease-in-out` - Smooth acceleration/deceleration

### 3.5.4 Curation UI

| Tool | Test Case | Input | Expected Output | Verification |
|------|-----------|-------|-----------------|--------------|
| `generation_compare` | Compare variants | `panelId`, `imageIds: [id1, id2, id3]` | Comparison data | Side-by-side metadata |
| `generation_batch_rate` | Rate multiple at once | `ratings: [{imageId, rating: 5}, ...]` | Update results | All ratings saved |
| `generation_batch_favorite` | Favorite multiple | `imageIds`, `favorite: true` | Update results | All marked favorite |
| `generation_quick_select` | Auto-select best | `panelId`, `criteria: "highest_rating"` | Selected image | Highest rated selected |
| `generation_stats` | Get statistics | `imageIds: [...]` | Stats breakdown | By rating, seed, cfg |
| `generation_get_unrated` | Find unrated images | `panelId` | Unrated images | Only rating=null returned |

**Quick Select Criteria:**
- `highest_rating` - Best rated
- `most_recent` - Latest generated
- `oldest` - First generated
- `favorite` - First favorited

### 3.5.5 Prompt Archaeology

| Tool | Test Case | Input | Expected Output | Verification |
|------|-----------|-------|-----------------|--------------|
| `generation_analyze` | Analyze successful patterns | `projectId`, `minRating: 4` | AnalysisResult | Patterns identified |
| `generation_suggest_params` | Get recommendations | `projectId`, `prompt: "1girl, forest"` | SuggestedParams | Model, CFG, sampler suggested |
| `generation_find_similar` | Find similar successes | `prompt: "warrior pose"`, `minRating: 4` | Similar generations | Ranked by similarity |

**Analysis Output to Verify:**
- `patterns` - Array of { category, value, avgRating, successRate }
- `recommendations` - String array of suggestions
- `bestSettings` - { model, cfg, sampler, topLoras, topPromptTerms }

### 3.5.6 Scene Lighting

| Tool | Test Case | Input | Expected Output | Verification |
|------|-----------|-------|-----------------|--------------|
| `storyboard_set_lighting` | Configure lighting | `storyboardId`, `config: {...}` | Updated storyboard | lightingConfig saved |
| `storyboard_get_lighting` | Get current config | `storyboardId` | Lighting config | Returns full config |
| `storyboard_clear_lighting` | Remove lighting | `storyboardId` | Cleared storyboard | lightingConfig = null |
| `lighting_suggest` | AI suggest from description | `sceneDescription: "romantic candlelit dinner"` | Suggested config | Appropriate lighting |
| `lighting_preview` | Preview prompt fragment | `config: {...}` | Prompt fragment | Lighting keywords |
| `lighting_list_options` | List all options | None | All options | Types, directions, times, weather |

**Lighting Config Structure:**
```json
{
  "primarySource": {
    "type": "natural" | "artificial" | "fire" | "magical" | "ambient",
    "direction": "front" | "back" | "side" | "top" | "bottom",
    "intensity": 0.0-1.0,
    "color": "#RRGGBB"
  },
  "secondarySource": { ... },
  "ambientColor": "#RRGGBB",
  "timeOfDay": "dawn" | "morning" | "noon" | "afternoon" | "dusk" | "night",
  "weather": "clear" | "cloudy" | "overcast" | "foggy" | "rainy"
}
```

### 3.5.7 Interaction Poses

| Tool | Test Case | Input | Expected Output | Verification |
|------|-----------|-------|-----------------|--------------|
| `interaction_pose_list` | List by category | `category: "romantic"` | Romantic poses | Filtered correctly |
| `interaction_pose_list` | Filter by rating | `maxRating: "suggestive"` | Safe + suggestive only | No explicit |
| `interaction_pose_get` | Get by ID | `id` | Full pose record | Includes GLIGEN boxes |
| `interaction_pose_get` | Get by name | `name: "missionary"` | Full pose record | Name lookup works |
| `interaction_pose_create` | Create custom pose | Full pose definition | New pose record | Saved to DB |
| `interaction_pose_update` | Update pose | `id`, `tags: ["new_tag"]` | Updated record | Tags updated |
| `interaction_pose_delete` | Delete custom pose | `id` | Success | Record removed |
| `interaction_pose_delete` | Reject builtin delete | `id` (builtin) | Error | Cannot delete builtins |
| `interaction_pose_apply` | Apply with mapping | `poseId`, `characterMapping` | Prompt + GLIGEN data | Ready for generation |
| `interaction_pose_popular` | Get by usage | `limit: 5` | Top 5 used | Ordered by usageCount |
| `interaction_pose_list_categories` | Get categories | None | Categories + ratings | All options listed |
| `interaction_pose_seed` | Seed defaults | None | Seeded count | Default poses created |

**Default Poses to Verify Exist After Seeding:**
- **Romantic:** holding_hands, embrace, kiss, cuddling_sitting, cuddling_lying
- **Intimate:** missionary, cowgirl, reverse_cowgirl, doggy_style, sixty_nine, spooning_sex, standing_sex, oral_kneeling
- **Action:** fighting_punch, dancing_ballroom, carrying_bridal, piggyback
- **Conversation:** facing_standing, side_by_side_sitting, over_shoulder, across_table

### 3.5.8 Custom LoRAs & Embeddings

| Tool | Test Case | Input | Expected Output | Verification |
|------|-----------|-------|-----------------|--------------|
| `asset_register` | Register LoRA | `projectId`, `type: "lora"`, `filePath`, `triggerWord` | Asset record | Saved with defaults |
| `asset_register` | Register embedding | `projectId`, `type: "embedding"`, ... | Asset record | Type = embedding |
| `asset_register` | With character link | Above + `characterId` | Asset record | Character associated |
| `asset_get` | Get by ID | `id` | Full asset record | All fields present |
| `asset_get` | Get by name | `projectId`, `name` | Full asset record | Name lookup works |
| `asset_list` | List by project | `projectId` | Project assets | Project-scoped |
| `asset_list` | Filter by type | `type: "lora"` | LoRAs only | No embeddings |
| `asset_list` | Filter by character | `characterId` | Character assets | Character-scoped |
| `asset_update` | Update strength | `id`, `defaultStrength: 0.8` | Updated record | Strength changed |
| `asset_delete` | Remove asset | `id` | Success | Record removed |
| `asset_apply` | Apply asset | `id` | Trigger + config | Ready for injection |
| `asset_apply` | With override | `id`, `strengthOverride: 0.5` | Config with 0.5 | Override applied |
| `asset_apply_character` | Get character assets | `characterId` | Triggers + LoRA stack | All character assets |
| `asset_popular` | Get most used | `projectId`, `limit: 5` | Top 5 assets | By usageCount |
| `asset_deactivate` | Soft delete | `id` | Deactivated | isActive = false |
| `asset_activate` | Reactivate | `id` | Activated | isActive = true |

---

## End-to-End Demo Scenario

### Scenario: Creating a 2-Character Romantic Scene for a Graphic Novel

**Setup:** We're creating a romantic scene between two furry characters for a graphic novel panel. We'll use ALL Phase 3.5 features.

#### Step 1: Project & Character Setup (Prerequisites)

```typescript
// Assume these exist from earlier phases
const project = { id: "proj-001", name: "Love Story" };
const characterA = { id: "char-001", name: "Luna", species: "wolf" };
const characterB = { id: "char-002", name: "Max", species: "fox" };
const storyboard = { id: "sb-001", name: "Chapter 3 - First Kiss" };
```

#### Step 2: Register Custom Assets (3.5.8)

```json
// Register Luna's character LoRA
{
  "tool": "asset_register",
  "args": {
    "projectId": "proj-001",
    "characterId": "char-001",
    "name": "luna_character_v2",
    "displayName": "Luna Character LoRA v2",
    "type": "lora",
    "filePath": "loras/luna_wolf_v2.safetensors",
    "triggerWord": "luna_wolf",
    "triggerAliases": ["luna", "lunawolf"],
    "defaultStrength": 0.85,
    "defaultClipStrength": 1.0,
    "baseModel": "pony",
    "tags": ["character", "wolf", "female"]
  }
}

// Register Max's character LoRA
{
  "tool": "asset_register",
  "args": {
    "projectId": "proj-001",
    "characterId": "char-002",
    "name": "max_character_v1",
    "displayName": "Max Character LoRA",
    "type": "lora",
    "filePath": "loras/max_fox_v1.safetensors",
    "triggerWord": "max_fox",
    "defaultStrength": 0.8,
    "baseModel": "pony",
    "tags": ["character", "fox", "male"]
  }
}
```

#### Step 3: Set Scene Lighting (3.5.6)

```json
// Get AI suggestion for romantic scene
{
  "tool": "lighting_suggest",
  "args": {
    "sceneDescription": "romantic evening kiss under streetlamp in light rain"
  }
}
// Returns suggested config...

// Apply lighting to storyboard
{
  "tool": "storyboard_set_lighting",
  "args": {
    "storyboardId": "sb-001",
    "config": {
      "primarySource": {
        "type": "artificial",
        "direction": "top",
        "intensity": 0.7,
        "color": "#FFE4B5"
      },
      "ambientColor": "#2F4F4F",
      "timeOfDay": "night",
      "weather": "rainy"
    }
  }
}

// Preview the prompt fragment
{
  "tool": "lighting_preview",
  "args": {
    "config": { /* same config */ }
  }
}
// Returns: "artificial lighting, top lighting, warm light, nighttime, night sky, rain, wet surfaces, raindrops"
```

#### Step 4: Seed & Select Interaction Pose (3.5.7)

```json
// Ensure default poses exist
{
  "tool": "interaction_pose_seed",
  "args": {}
}
// Returns: "Seeded 22 new interaction pose presets"

// List romantic poses
{
  "tool": "interaction_pose_list",
  "args": {
    "category": "romantic",
    "maxRating": "suggestive"
  }
}
// Returns: holding_hands, embrace, kiss, cuddling_sitting, cuddling_lying

// Get the kiss pose details
{
  "tool": "interaction_pose_get",
  "args": {
    "name": "kiss"
  }
}
// Returns full pose with GLIGEN boxes and pose definitions

// Apply the pose with character mapping
{
  "tool": "interaction_pose_apply",
  "args": {
    "poseId": "kiss",
    "characterMapping": {
      "char-001": "character_a",
      "char-002": "character_b"
    }
  }
}
// Returns:
// {
//   "promptFragment": "kissing, lips touching, romantic kiss",
//   "negativeFragment": "apart, mouths closed",
//   "gligenBoxes": [
//     { "position": "character_a", "x": 0.15, "y": 0.1, "width": 0.4, "height": 0.8 },
//     { "position": "character_b", "x": 0.45, "y": 0.1, "width": 0.4, "height": 0.8 }
//   ],
//   "poseDescriptions": {
//     "char-001": "leaning in, lips touching partner, kissing",
//     "char-002": "leaning in, lips touching partner, being kissed"
//   }
// }
```

#### Step 5: Get Asset Configuration (3.5.8)

```json
// Get all assets for both characters
{
  "tool": "asset_apply_character",
  "args": { "characterId": "char-001" }
}
// Returns: { triggers: ["luna_wolf"], loraStack: [{name: "loras/luna_wolf_v2.safetensors", ...}] }

{
  "tool": "asset_apply_character",
  "args": { "characterId": "char-002" }
}
// Returns: { triggers: ["max_fox"], loraStack: [{name: "loras/max_fox_v1.safetensors", ...}] }
```

#### Step 6: Analyze Past Successes (3.5.5)

```json
// Before generating, check what worked before
{
  "tool": "generation_analyze",
  "args": {
    "projectId": "proj-001",
    "minRating": 4
  }
}
// Returns patterns showing best CFG, sampler, common successful terms

// Get parameter suggestions for our prompt
{
  "tool": "generation_suggest_params",
  "args": {
    "projectId": "proj-001",
    "prompt": "2characters, luna_wolf, max_fox, kissing, romantic, nighttime, rain"
  }
}
// Returns: { model: "ponyDiffusion_v6.safetensors", cfg: 7, sampler: "euler_ancestral", ... }
```

#### Step 7: Generate the Panel (Using panel_generate from earlier phase)

```json
// Create panel and generate with all the gathered info
{
  "tool": "panel_create",
  "args": {
    "storyboardId": "sb-001",
    "position": 1,
    "description": "Luna and Max share their first kiss under a streetlamp in the rain"
  }
}

// Generate with variants
{
  "tool": "panel_generate_variants",
  "args": {
    "panelId": "panel-001",
    "count": 4,
    "prompt": "2characters, luna_wolf, max_fox, kissing, lips touching, romantic kiss, artificial lighting, top lighting, warm light, nighttime, rain, wet surfaces",
    "negativePrompt": "apart, mouths closed, bad quality",
    "model": "ponyDiffusion_v6.safetensors",
    "loras": [
      { "name": "loras/luna_wolf_v2.safetensors", "strengthModel": 0.85 },
      { "name": "loras/max_fox_v1.safetensors", "strengthModel": 0.8 }
    ],
    "cfg": 7,
    "steps": 28
  }
}
// Generates 4 variants
```

#### Step 8: Curate the Variants (3.5.4)

```json
// Compare the variants
{
  "tool": "generation_compare",
  "args": {
    "panelId": "panel-001"
  }
}
// Returns all variants with metadata for comparison

// Rate them
{
  "tool": "generation_batch_rate",
  "args": {
    "ratings": [
      { "imageId": "gen-001", "rating": 3 },
      { "imageId": "gen-002", "rating": 5 },
      { "imageId": "gen-003", "rating": 4 },
      { "imageId": "gen-004", "rating": 2 }
    ]
  }
}

// Quick select the best one
{
  "tool": "generation_quick_select",
  "args": {
    "panelId": "panel-001",
    "criteria": "highest_rating"
  }
}
// Selects gen-002 (rating 5)

// Get stats on what worked
{
  "tool": "generation_stats",
  "args": {
    "imageIds": ["gen-001", "gen-002", "gen-003", "gen-004"]
  }
}
```

#### Step 9: Fix the Hands with Inpainting (3.5.2)

```json
// The selected image has slightly off hands - let's fix them

// Create mask for hands
{
  "tool": "panel_create_mask",
  "args": {
    "imagePath": "/output/gen-002.png",
    "preset": "hands",
    "outputPath": "/output/gen-002_hands_mask.png"
  }
}

// Inpaint the hands region
{
  "tool": "panel_inpaint",
  "args": {
    "panelId": "panel-001",
    "maskPath": "/output/gen-002_hands_mask.png",
    "prompt": "detailed paws, fingers intertwined, holding hands",
    "denoisingStrength": 0.6,
    "outputPath": "/output/gen-002_fixed.png"
  }
}

// Alternative: Use InstructPix2Pix for text-based edit
{
  "tool": "panel_edit",
  "args": {
    "panelId": "panel-001",
    "instruction": "improve the hands, make fingers more defined",
    "outputPath": "/output/gen-002_edited.png"
  }
}
```

#### Step 10: Extract & Save the Pose (3.5.1)

```json
// This turned out great! Save the pose for reuse

// Extract pose from the final image
{
  "tool": "pose_extract_and_save",
  "args": {
    "generationId": "gen-002",
    "projectId": "proj-001",
    "category": "romantic",
    "tags": ["kiss", "two_character", "standing", "rain"],
    "description": "Luna and Max kissing pose - rain scene"
  }
}
// Saves the OpenPose skeleton to the library

// Also save Luna's expression
{
  "tool": "expression_save",
  "args": {
    "characterId": "char-001",
    "sourceGenerationId": "gen-002",
    "name": "romantic_kiss",
    "description": "Eyes closed, peaceful kissing expression",
    "tags": ["romantic", "kiss", "eyes_closed"]
  }
}
```

#### Step 11: Create Keyframe for Interpolation (3.5.3)

```json
// We want to animate the approach to the kiss
// First, create the "before" panel (characters facing each other, about to kiss)

{
  "tool": "panel_create",
  "args": {
    "storyboardId": "sb-001",
    "position": 0,
    "description": "Luna and Max facing each other, about to kiss"
  }
}

// Generate the "before" state
{
  "tool": "panel_generate",
  "args": {
    "panelId": "panel-000",
    "prompt": "2characters, luna_wolf, max_fox, facing each other, about to kiss, romantic tension, nighttime, rain",
    // ... same settings
  }
}

// Select the best variant for panel-000
// ...

// Now interpolate between the two keyframes!
{
  "tool": "interpolation_suggest_count",
  "args": {
    "panelAPosition": 0,
    "panelBPosition": 1,
    "framesPerSecond": 12,
    "durationSeconds": 0.5
  }
}
// Returns: { suggestedCount: 6 }

// Generate the in-between frames
{
  "tool": "panel_interpolate",
  "args": {
    "panelAId": "panel-000",
    "panelBId": "panel-001",
    "count": 6,
    "outputDir": "/output/interpolation/kiss_sequence",
    "maintainIdentity": true,
    "blendPose": true,
    "easing": "ease-in-out"
  }
}
// Generates 6 smooth transition frames!
```

#### Step 12: Verify Everything

```json
// List all poses saved
{
  "tool": "pose_list",
  "args": {
    "projectId": "proj-001",
    "category": "romantic"
  }
}

// List expressions for Luna
{
  "tool": "expression_list",
  "args": {
    "characterId": "char-001"
  }
}

// Check asset usage stats
{
  "tool": "asset_popular",
  "args": {
    "projectId": "proj-001",
    "limit": 5
  }
}

// Check interaction pose usage
{
  "tool": "interaction_pose_popular",
  "args": {
    "limit": 5
  }
}

// Final lighting check
{
  "tool": "storyboard_get_lighting",
  "args": {
    "storyboardId": "sb-001"
  }
}
```

---

## Verification Checklist

### Pre-Test Setup
- [ ] Database initialized with test project, characters, storyboard
- [ ] ComfyUI running and accessible
- [ ] At least one panel with generated images exists for curation tests
- [ ] Test LoRA files available in ComfyUI models directory

### Feature Verification

#### 3.5.1 Pose & Expression Libraries
- [ ] Can extract pose from existing generation
- [ ] Can save pose to project library with tags
- [ ] Can list poses filtered by category
- [ ] Can retrieve specific pose by ID
- [ ] Can save expression linked to character
- [ ] Can list expressions for a character
- [ ] Can get expression by name

#### 3.5.2 Smart Inpainting
- [ ] Can generate mask from preset (hands, face, etc.)
- [ ] Can inpaint region with custom prompt
- [ ] Can use InstructPix2Pix for text-based editing
- [ ] Inpainted result blends naturally

#### 3.5.3 Panel Interpolation
- [ ] Can get suggested frame count
- [ ] Can generate interpolated frames between two panels
- [ ] Identity preserved when maintainIdentity=true
- [ ] Easing functions produce different timing
- [ ] Pose blending produces smooth transitions

#### 3.5.4 Curation UI
- [ ] Can compare multiple variants
- [ ] Can batch rate images
- [ ] Can batch favorite images
- [ ] Quick select finds correct image by criteria
- [ ] Stats correctly aggregate image data
- [ ] Can find unrated images

#### 3.5.5 Prompt Archaeology
- [ ] Analysis identifies patterns from successful generations
- [ ] Parameter suggestions based on project history
- [ ] Can find similar past generations

#### 3.5.6 Scene Lighting
- [ ] Can set lighting config on storyboard
- [ ] Can get current lighting config
- [ ] Can clear lighting config
- [ ] AI suggestions appropriate for scene description
- [ ] Prompt fragment includes correct lighting keywords
- [ ] List options returns all available choices

#### 3.5.7 Interaction Poses
- [ ] Seed creates all default poses
- [ ] Can list by category
- [ ] Can filter by rating
- [ ] Can get pose by ID or name
- [ ] Can create custom pose
- [ ] Cannot delete builtin poses
- [ ] Can delete custom poses
- [ ] Apply returns correct GLIGEN boxes and prompts
- [ ] Usage count increments on apply

#### 3.5.8 Custom Assets
- [ ] Can register LoRA with trigger word
- [ ] Can register embedding
- [ ] Can associate asset with character
- [ ] Can list assets by project/character/type
- [ ] Apply returns correct trigger and LoRA config
- [ ] Apply increments usage count
- [ ] Can deactivate/activate assets
- [ ] Deactivated assets excluded from lists (when activeOnly=true)

---

## MCP Tool Test Commands (Copy-Paste Ready)

```bash
# Run all tests via the MCP test harness (if available)
# Or use these as individual MCP tool calls

# === 3.5.7 Interaction Poses - Quick Test ===
# 1. Seed defaults
mcp call interaction_pose_seed '{}'

# 2. List romantic poses
mcp call interaction_pose_list '{"category": "romantic"}'

# 3. Get kiss pose
mcp call interaction_pose_get '{"name": "kiss"}'

# 4. Apply with characters
mcp call interaction_pose_apply '{"poseId": "kiss", "characterMapping": {"char-1": "character_a", "char-2": "character_b"}}'

# === 3.5.6 Lighting - Quick Test ===
# 1. Suggest lighting
mcp call lighting_suggest '{"sceneDescription": "sunset beach romantic"}'

# 2. Preview fragment
mcp call lighting_preview '{"config": {"primarySource": {"type": "natural", "direction": "back", "intensity": 0.8}, "timeOfDay": "dusk"}}'

# 3. List all options
mcp call lighting_list_options '{}'

# === 3.5.8 Custom Assets - Quick Test ===
# 1. Register asset
mcp call asset_register '{"projectId": "test-proj", "name": "test_lora", "displayName": "Test LoRA", "type": "lora", "filePath": "test.safetensors", "triggerWord": "test_trigger"}'

# 2. List assets
mcp call asset_list '{"projectId": "test-proj"}'

# 3. Apply asset
mcp call asset_apply '{"id": "<asset-id>"}'
```

---

## Integration Test Scenarios

### Scenario A: Full Character Generation Pipeline
1. Register character LoRA → 2. Set scene lighting → 3. Select interaction pose → 4. Generate panel → 5. Curate variants → 6. Inpaint fixes → 7. Save pose/expression

### Scenario B: Animation Sequence Creation
1. Create keyframe A → 2. Create keyframe B → 3. Get interpolation suggestion → 4. Generate in-betweens → 5. Review sequence

### Scenario C: Style Exploration
1. Analyze past successes → 2. Get parameter suggestions → 3. Generate with suggestions → 4. Compare to baseline → 5. Rate and learn

### Scenario D: Multi-Character Scene
1. Seed interaction poses → 2. Select pose → 3. Apply with character mapping → 4. Get character assets → 5. Generate with GLIGEN boxes → 6. Fix with inpainting

---

## Notes for Test Execution

1. **Database State:** Some tests require existing data (panels with generations). Run setup steps first.

2. **ComfyUI Dependency:** Inpainting, interpolation, and pose extraction require ComfyUI. Mock tests can verify service logic without generation.

3. **File System:** Ensure output directories exist and are writable.

4. **Seeding:** Run `interaction_pose_seed` once per fresh database to populate default poses.

5. **Cleanup:** After testing, consider clearing test data to avoid polluting the database.

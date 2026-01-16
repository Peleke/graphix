/**
 * Interaction Pose Seed Data
 *
 * Default presets for multi-character interactions.
 * Categories: romantic, intimate, action, conversation
 */

import type { CreateInteractionPoseOptions } from "./interaction-pose.service.js";

// ============================================================================
// Romantic Poses (Safe - Suggestive)
// ============================================================================

const romanticPoses: CreateInteractionPoseOptions[] = [
  {
    name: "holding_hands",
    displayName: "Holding Hands",
    description: "Two characters holding hands while standing side by side",
    category: "romantic",
    characterCount: 2,
    poseDefinitions: [
      {
        position: "character_a",
        role: "left",
        poseDescription: "standing, arm extended to side, holding hands",
        relativePosition: "beside",
      },
      {
        position: "character_b",
        role: "right",
        poseDescription: "standing, arm extended to side, holding hands",
        relativePosition: "beside",
      },
    ],
    gligenBoxes: [
      { position: "character_a", x: 0.1, y: 0.1, width: 0.35, height: 0.8 },
      { position: "character_b", x: 0.55, y: 0.1, width: 0.35, height: 0.8 },
    ],
    promptFragment: "holding hands, standing together, romantic couple",
    negativeFragment: "apart, separated",
    tags: ["standing", "hands", "couple", "gentle"],
    rating: "safe",
  },
  {
    name: "embrace",
    displayName: "Embrace",
    description: "Two characters in a standing embrace/hug",
    category: "romantic",
    characterCount: 2,
    poseDefinitions: [
      {
        position: "character_a",
        role: "hugging",
        poseDescription: "standing, arms wrapped around partner, embracing",
        relativePosition: "facing",
      },
      {
        position: "character_b",
        role: "hugged",
        poseDescription: "standing, arms around partner, being embraced",
        relativePosition: "facing",
      },
    ],
    gligenBoxes: [
      { position: "character_a", x: 0.2, y: 0.1, width: 0.4, height: 0.8 },
      { position: "character_b", x: 0.4, y: 0.1, width: 0.4, height: 0.8 },
    ],
    promptFragment: "embracing, hugging, arms around each other, romantic embrace",
    negativeFragment: "apart, distant",
    tags: ["standing", "hug", "embrace", "intimate"],
    rating: "safe",
  },
  {
    name: "kiss",
    displayName: "Kiss",
    description: "Two characters sharing a kiss",
    category: "romantic",
    characterCount: 2,
    poseDefinitions: [
      {
        position: "character_a",
        role: "kissing",
        poseDescription: "leaning in, lips touching partner, kissing",
        relativePosition: "facing",
      },
      {
        position: "character_b",
        role: "kissed",
        poseDescription: "leaning in, lips touching partner, being kissed",
        relativePosition: "facing",
      },
    ],
    gligenBoxes: [
      { position: "character_a", x: 0.15, y: 0.1, width: 0.4, height: 0.8 },
      { position: "character_b", x: 0.45, y: 0.1, width: 0.4, height: 0.8 },
    ],
    promptFragment: "kissing, lips touching, romantic kiss",
    negativeFragment: "apart, mouths closed",
    tags: ["kiss", "romantic", "intimate", "standing"],
    rating: "suggestive",
  },
  {
    name: "cuddling_sitting",
    displayName: "Cuddling (Sitting)",
    description: "Two characters cuddling while sitting",
    category: "romantic",
    characterCount: 2,
    poseDefinitions: [
      {
        position: "character_a",
        role: "holder",
        poseDescription: "sitting, arm around partner, cuddling",
        relativePosition: "beside",
      },
      {
        position: "character_b",
        role: "leaning",
        poseDescription: "sitting, leaning against partner, head on shoulder",
        relativePosition: "beside",
      },
    ],
    gligenBoxes: [
      { position: "character_a", x: 0.1, y: 0.3, width: 0.4, height: 0.6 },
      { position: "character_b", x: 0.45, y: 0.3, width: 0.4, height: 0.6 },
    ],
    promptFragment: "cuddling, sitting together, head on shoulder, cozy",
    negativeFragment: "standing, apart",
    tags: ["sitting", "cuddle", "cozy", "gentle"],
    rating: "safe",
  },
  {
    name: "cuddling_lying",
    displayName: "Cuddling (Lying)",
    description: "Two characters cuddling while lying down",
    category: "romantic",
    characterCount: 2,
    poseDefinitions: [
      {
        position: "character_a",
        role: "big_spoon",
        poseDescription: "lying on side, arm around partner",
        relativePosition: "behind",
      },
      {
        position: "character_b",
        role: "little_spoon",
        poseDescription: "lying on side, curled up against partner",
        relativePosition: "in_front",
      },
    ],
    gligenBoxes: [
      { position: "character_a", x: 0.05, y: 0.4, width: 0.5, height: 0.5 },
      { position: "character_b", x: 0.35, y: 0.4, width: 0.5, height: 0.5 },
    ],
    promptFragment: "spooning, lying together, cuddling in bed",
    negativeFragment: "standing, sitting",
    tags: ["lying", "bed", "spoon", "intimate"],
    rating: "suggestive",
  },
];

// ============================================================================
// Intimate Poses (Explicit)
// ============================================================================

const intimatePoses: CreateInteractionPoseOptions[] = [
  {
    name: "missionary",
    displayName: "Missionary",
    description: "Classic missionary position",
    category: "intimate",
    characterCount: 2,
    poseDefinitions: [
      {
        position: "character_a",
        role: "top",
        poseDescription: "on top, arms supporting weight, looking down at partner",
        relativePosition: "above",
      },
      {
        position: "character_b",
        role: "bottom",
        poseDescription: "lying on back, legs spread, looking up at partner",
        relativePosition: "below",
      },
    ],
    gligenBoxes: [
      { position: "character_a", x: 0.2, y: 0.1, width: 0.6, height: 0.5 },
      { position: "character_b", x: 0.2, y: 0.4, width: 0.6, height: 0.55 },
    ],
    promptFragment: "missionary position, sex, penetration, on bed",
    negativeFragment: "standing, sitting, clothed",
    tags: ["missionary", "classic", "face_to_face", "lying"],
    rating: "explicit",
  },
  {
    name: "cowgirl",
    displayName: "Cowgirl",
    description: "Cowgirl/riding position",
    category: "intimate",
    characterCount: 2,
    poseDefinitions: [
      {
        position: "character_a",
        role: "rider",
        poseDescription: "straddling partner, hands on chest, riding",
        relativePosition: "above",
      },
      {
        position: "character_b",
        role: "bottom",
        poseDescription: "lying on back, hands on partner's hips",
        relativePosition: "below",
      },
    ],
    gligenBoxes: [
      { position: "character_a", x: 0.25, y: 0.05, width: 0.5, height: 0.55 },
      { position: "character_b", x: 0.15, y: 0.45, width: 0.7, height: 0.5 },
    ],
    promptFragment: "cowgirl position, riding, straddling, sex",
    negativeFragment: "standing, missionary, clothed",
    tags: ["cowgirl", "riding", "female_on_top"],
    rating: "explicit",
  },
  {
    name: "reverse_cowgirl",
    displayName: "Reverse Cowgirl",
    description: "Reverse cowgirl position",
    category: "intimate",
    characterCount: 2,
    poseDefinitions: [
      {
        position: "character_a",
        role: "rider",
        poseDescription: "straddling partner facing away, riding",
        relativePosition: "above",
      },
      {
        position: "character_b",
        role: "bottom",
        poseDescription: "lying on back, hands on partner's hips/ass",
        relativePosition: "below",
      },
    ],
    gligenBoxes: [
      { position: "character_a", x: 0.25, y: 0.05, width: 0.5, height: 0.55 },
      { position: "character_b", x: 0.15, y: 0.45, width: 0.7, height: 0.5 },
    ],
    promptFragment: "reverse cowgirl, riding facing away, sex",
    negativeFragment: "face_to_face, missionary, clothed",
    tags: ["reverse_cowgirl", "riding", "from_behind"],
    rating: "explicit",
  },
  {
    name: "doggy_style",
    displayName: "Doggy Style",
    description: "From behind position on all fours",
    category: "intimate",
    characterCount: 2,
    poseDefinitions: [
      {
        position: "character_a",
        role: "behind",
        poseDescription: "kneeling behind partner, hands on hips, thrusting",
        relativePosition: "behind",
      },
      {
        position: "character_b",
        role: "front",
        poseDescription: "on all fours, presenting, looking back",
        relativePosition: "in_front",
      },
    ],
    gligenBoxes: [
      { position: "character_a", x: 0.5, y: 0.2, width: 0.45, height: 0.7 },
      { position: "character_b", x: 0.05, y: 0.3, width: 0.55, height: 0.6 },
    ],
    promptFragment: "doggy style, from behind, on all fours, sex",
    negativeFragment: "face_to_face, missionary, standing, clothed",
    tags: ["doggy", "from_behind", "all_fours"],
    rating: "explicit",
  },
  {
    name: "sixty_nine",
    displayName: "69",
    description: "Mutual oral position",
    category: "intimate",
    characterCount: 2,
    poseDefinitions: [
      {
        position: "character_a",
        role: "top",
        poseDescription: "on top, head between partner's legs, giving oral",
        relativePosition: "above",
      },
      {
        position: "character_b",
        role: "bottom",
        poseDescription: "on bottom, head between partner's legs, giving oral",
        relativePosition: "below",
      },
    ],
    gligenBoxes: [
      { position: "character_a", x: 0.1, y: 0.1, width: 0.8, height: 0.45 },
      { position: "character_b", x: 0.1, y: 0.45, width: 0.8, height: 0.45 },
    ],
    promptFragment: "69 position, mutual oral, head between legs",
    negativeFragment: "penetration, standing, clothed",
    tags: ["69", "oral", "mutual"],
    rating: "explicit",
  },
  {
    name: "spooning_sex",
    displayName: "Spooning (Intimate)",
    description: "Side-lying intimate position",
    category: "intimate",
    characterCount: 2,
    poseDefinitions: [
      {
        position: "character_a",
        role: "big_spoon",
        poseDescription: "lying on side behind partner, arm around, penetrating",
        relativePosition: "behind",
      },
      {
        position: "character_b",
        role: "little_spoon",
        poseDescription: "lying on side, leg lifted, being penetrated from behind",
        relativePosition: "in_front",
      },
    ],
    gligenBoxes: [
      { position: "character_a", x: 0.0, y: 0.3, width: 0.55, height: 0.6 },
      { position: "character_b", x: 0.35, y: 0.3, width: 0.6, height: 0.6 },
    ],
    promptFragment: "spooning sex, lying on side, from behind, intimate",
    negativeFragment: "standing, sitting, clothed",
    tags: ["spooning", "lying", "from_behind", "gentle"],
    rating: "explicit",
  },
  {
    name: "standing_sex",
    displayName: "Standing Sex",
    description: "Standing position with one character lifted",
    category: "intimate",
    characterCount: 2,
    poseDefinitions: [
      {
        position: "character_a",
        role: "lifter",
        poseDescription: "standing, holding partner up, penetrating",
        relativePosition: "holding",
      },
      {
        position: "character_b",
        role: "lifted",
        poseDescription: "legs wrapped around partner, arms around neck, being held",
        relativePosition: "held",
      },
    ],
    gligenBoxes: [
      { position: "character_a", x: 0.2, y: 0.1, width: 0.6, height: 0.85 },
      { position: "character_b", x: 0.25, y: 0.15, width: 0.5, height: 0.6 },
    ],
    promptFragment: "standing sex, lifted up, legs wrapped, carrying",
    negativeFragment: "lying, sitting, clothed",
    tags: ["standing", "lifted", "athletic"],
    rating: "explicit",
  },
  {
    name: "oral_kneeling",
    displayName: "Oral (Kneeling)",
    description: "One character kneeling giving oral",
    category: "intimate",
    characterCount: 2,
    poseDefinitions: [
      {
        position: "character_a",
        role: "standing",
        poseDescription: "standing, hands on partner's head, receiving oral",
        relativePosition: "above",
      },
      {
        position: "character_b",
        role: "kneeling",
        poseDescription: "kneeling, head at partner's crotch, giving oral",
        relativePosition: "below",
      },
    ],
    gligenBoxes: [
      { position: "character_a", x: 0.25, y: 0.0, width: 0.5, height: 0.7 },
      { position: "character_b", x: 0.25, y: 0.5, width: 0.5, height: 0.45 },
    ],
    promptFragment: "oral sex, kneeling, blowjob, fellatio",
    negativeFragment: "penetration, lying, clothed",
    tags: ["oral", "kneeling", "blowjob"],
    rating: "explicit",
  },
];

// ============================================================================
// Action Poses
// ============================================================================

const actionPoses: CreateInteractionPoseOptions[] = [
  {
    name: "fighting_punch",
    displayName: "Fighting (Punch)",
    description: "One character punching another",
    category: "action",
    characterCount: 2,
    poseDefinitions: [
      {
        position: "character_a",
        role: "attacker",
        poseDescription: "throwing a punch, arm extended, aggressive stance",
        relativePosition: "attacking",
      },
      {
        position: "character_b",
        role: "defender",
        poseDescription: "recoiling from punch, blocking or hit",
        relativePosition: "defending",
      },
    ],
    gligenBoxes: [
      { position: "character_a", x: 0.05, y: 0.1, width: 0.45, height: 0.8 },
      { position: "character_b", x: 0.5, y: 0.1, width: 0.45, height: 0.8 },
    ],
    promptFragment: "fighting, punching, combat, dynamic action",
    negativeFragment: "peaceful, hugging, romantic",
    tags: ["fight", "action", "punch", "combat"],
    rating: "safe",
  },
  {
    name: "dancing_ballroom",
    displayName: "Ballroom Dancing",
    description: "Two characters in a ballroom dance pose",
    category: "action",
    characterCount: 2,
    poseDefinitions: [
      {
        position: "character_a",
        role: "lead",
        poseDescription: "leading dance, one hand on partner's waist, other holding hand",
        relativePosition: "facing",
      },
      {
        position: "character_b",
        role: "follow",
        poseDescription: "following dance, hand on partner's shoulder, other hand held",
        relativePosition: "facing",
      },
    ],
    gligenBoxes: [
      { position: "character_a", x: 0.15, y: 0.1, width: 0.4, height: 0.8 },
      { position: "character_b", x: 0.45, y: 0.1, width: 0.4, height: 0.8 },
    ],
    promptFragment: "ballroom dancing, waltz pose, elegant dance",
    negativeFragment: "fighting, sitting",
    tags: ["dance", "ballroom", "elegant", "formal"],
    rating: "safe",
  },
  {
    name: "carrying_bridal",
    displayName: "Bridal Carry",
    description: "One character carrying another in a bridal carry",
    category: "action",
    characterCount: 2,
    poseDefinitions: [
      {
        position: "character_a",
        role: "carrier",
        poseDescription: "standing, arms under partner, carrying bridal style",
        relativePosition: "holding",
      },
      {
        position: "character_b",
        role: "carried",
        poseDescription: "being carried, arms around neck, legs together",
        relativePosition: "held",
      },
    ],
    gligenBoxes: [
      { position: "character_a", x: 0.15, y: 0.1, width: 0.5, height: 0.85 },
      { position: "character_b", x: 0.2, y: 0.2, width: 0.65, height: 0.5 },
    ],
    promptFragment: "bridal carry, princess carry, being carried",
    negativeFragment: "standing separately, walking",
    tags: ["carry", "bridal", "romantic", "lifting"],
    rating: "safe",
  },
  {
    name: "piggyback",
    displayName: "Piggyback Ride",
    description: "One character giving another a piggyback ride",
    category: "action",
    characterCount: 2,
    poseDefinitions: [
      {
        position: "character_a",
        role: "carrier",
        poseDescription: "standing, holding partner's legs, giving piggyback",
        relativePosition: "front",
      },
      {
        position: "character_b",
        role: "rider",
        poseDescription: "on partner's back, arms around shoulders, riding piggyback",
        relativePosition: "on_back",
      },
    ],
    gligenBoxes: [
      { position: "character_a", x: 0.2, y: 0.2, width: 0.5, height: 0.75 },
      { position: "character_b", x: 0.25, y: 0.0, width: 0.5, height: 0.6 },
    ],
    promptFragment: "piggyback ride, carrying on back, playful",
    negativeFragment: "bridal carry, front carry",
    tags: ["piggyback", "carry", "playful", "fun"],
    rating: "safe",
  },
];

// ============================================================================
// Conversation Poses
// ============================================================================

const conversationPoses: CreateInteractionPoseOptions[] = [
  {
    name: "facing_standing",
    displayName: "Facing (Standing)",
    description: "Two characters standing face to face in conversation",
    category: "conversation",
    characterCount: 2,
    poseDefinitions: [
      {
        position: "character_a",
        role: "speaker",
        poseDescription: "standing, facing partner, gesturing while talking",
        relativePosition: "facing",
      },
      {
        position: "character_b",
        role: "listener",
        poseDescription: "standing, facing partner, listening attentively",
        relativePosition: "facing",
      },
    ],
    gligenBoxes: [
      { position: "character_a", x: 0.05, y: 0.1, width: 0.4, height: 0.8 },
      { position: "character_b", x: 0.55, y: 0.1, width: 0.4, height: 0.8 },
    ],
    promptFragment: "talking, conversation, facing each other, standing",
    negativeFragment: "back to back, not facing",
    tags: ["conversation", "standing", "facing", "talking"],
    rating: "safe",
  },
  {
    name: "side_by_side_sitting",
    displayName: "Side by Side (Sitting)",
    description: "Two characters sitting side by side",
    category: "conversation",
    characterCount: 2,
    poseDefinitions: [
      {
        position: "character_a",
        role: "left",
        poseDescription: "sitting, turned slightly toward partner",
        relativePosition: "beside",
      },
      {
        position: "character_b",
        role: "right",
        poseDescription: "sitting, turned slightly toward partner",
        relativePosition: "beside",
      },
    ],
    gligenBoxes: [
      { position: "character_a", x: 0.05, y: 0.3, width: 0.45, height: 0.65 },
      { position: "character_b", x: 0.5, y: 0.3, width: 0.45, height: 0.65 },
    ],
    promptFragment: "sitting together, side by side, on bench, couch",
    negativeFragment: "standing, facing directly",
    tags: ["sitting", "side_by_side", "casual", "relaxed"],
    rating: "safe",
  },
  {
    name: "over_shoulder",
    displayName: "Over Shoulder",
    description: "One character looking over the other's shoulder",
    category: "conversation",
    characterCount: 2,
    poseDefinitions: [
      {
        position: "character_a",
        role: "front",
        poseDescription: "standing or sitting, focused on something in front",
        relativePosition: "front",
      },
      {
        position: "character_b",
        role: "behind",
        poseDescription: "standing behind, looking over partner's shoulder",
        relativePosition: "behind",
      },
    ],
    gligenBoxes: [
      { position: "character_a", x: 0.2, y: 0.15, width: 0.5, height: 0.8 },
      { position: "character_b", x: 0.35, y: 0.1, width: 0.5, height: 0.75 },
    ],
    promptFragment: "looking over shoulder, peering, from behind",
    negativeFragment: "facing each other, side by side",
    tags: ["over_shoulder", "behind", "looking", "curious"],
    rating: "safe",
  },
  {
    name: "across_table",
    displayName: "Across Table",
    description: "Two characters sitting across a table from each other",
    category: "conversation",
    characterCount: 2,
    poseDefinitions: [
      {
        position: "character_a",
        role: "near",
        poseDescription: "sitting at table, facing across",
        relativePosition: "across",
      },
      {
        position: "character_b",
        role: "far",
        poseDescription: "sitting at table, facing across",
        relativePosition: "across",
      },
    ],
    gligenBoxes: [
      { position: "character_a", x: 0.1, y: 0.35, width: 0.35, height: 0.6 },
      { position: "character_b", x: 0.55, y: 0.2, width: 0.35, height: 0.55 },
    ],
    promptFragment: "sitting across table, dining, meeting, conversation",
    negativeFragment: "side by side, standing",
    tags: ["table", "sitting", "facing", "dining", "meeting"],
    rating: "safe",
  },
];

// ============================================================================
// Export All Presets
// ============================================================================

export const DEFAULT_INTERACTION_POSES: CreateInteractionPoseOptions[] = [
  ...romanticPoses,
  ...intimatePoses,
  ...actionPoses,
  ...conversationPoses,
];

// Category-specific exports for selective seeding
export const ROMANTIC_POSES = romanticPoses;
export const INTIMATE_POSES = intimatePoses;
export const ACTION_POSES = actionPoses;
export const CONVERSATION_POSES = conversationPoses;

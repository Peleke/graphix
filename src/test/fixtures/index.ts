/**
 * Test Fixtures
 *
 * Reusable test data for consistent testing across all test suites.
 */

// Sample characters for testing
export const sampleCharacters = {
  otterHero: {
    name: "Otter Hero",
    profile: {
      species: "anthro otter",
      bodyType: "athletic",
      features: ["brown fur", "green eyes", "white belly patch", "webbed feet"],
      ageDescriptors: ["adult", "mature"],
      clothing: ["leather jacket", "cargo pants"],
      distinguishing: ["scar on left cheek", "gold earring"],
    },
    promptFragments: {
      positive:
        "anthro otter, brown fur, green eyes, athletic build, white belly, leather jacket, cargo pants, adult, mature, scar on cheek, gold earring",
      negative: "human, realistic, photo, feral",
      triggers: ["otter_hero_v1"],
    },
  },

  wolfCompanion: {
    name: "Wolf Companion",
    profile: {
      species: "anthro wolf",
      bodyType: "muscular",
      features: ["gray fur", "amber eyes", "fluffy tail", "dark muzzle"],
      ageDescriptors: ["adult"],
      clothing: ["tank top", "jeans"],
      distinguishing: ["tribal tattoo on arm"],
    },
    promptFragments: {
      positive:
        "anthro wolf, gray fur, amber eyes, muscular build, fluffy tail, dark muzzle, tank top, jeans, tribal tattoo",
      negative: "human, realistic, feral",
      triggers: [],
    },
  },

  foxFemboy: {
    name: "Fox Femboy",
    profile: {
      species: "anthro fox",
      bodyType: "slim",
      features: ["red fur", "blue eyes", "fluffy tail", "white chest"],
      ageDescriptors: ["young adult"],
      clothing: ["oversized hoodie", "thigh highs"],
      distinguishing: ["heart-shaped nose marking"],
    },
    promptFragments: {
      positive:
        "anthro fox, red fur, blue eyes, slim build, femboy, fluffy tail, white chest, oversized hoodie, thigh highs, heart nose marking",
      negative: "human, realistic, muscular",
      triggers: [],
    },
  },
};

// Sample panels for testing
export const samplePanels = {
  dramaticEntrance: {
    description: "Character enters the yacht through the main door, silhouetted against the sunset",
    direction: {
      cameraAngle: "low angle",
      mood: "dramatic",
      lighting: "golden hour",
    },
    characters: ["otterHero"],
  },

  friendlyMeeting: {
    description: "Two characters meet and shake hands in the yacht's lounge",
    direction: {
      cameraAngle: "medium shot",
      mood: "friendly",
      lighting: "soft",
    },
    characters: ["otterHero", "wolfCompanion"],
  },

  romanticScene: {
    description: "Characters share an intimate moment on the deck under the stars",
    direction: {
      cameraAngle: "close-up",
      mood: "romantic",
      lighting: "moonlight",
    },
    characters: ["otterHero", "foxFemboy"],
  },

  actionSequence: {
    description: "Character leaps across the gap between boats",
    direction: {
      cameraAngle: "dutch angle",
      mood: "action",
      lighting: "dramatic",
    },
    characters: ["wolfCompanion"],
  },
};

// Sample project settings
export const sampleProjectSettings = {
  default: {
    defaultModel: "yiffInHell_yihXXXTended.safetensors",
    defaultLoras: [
      { name: "Eleptors_Anthro_Furry_Lora_Illustrious_V2.safetensors", strength: 0.7 },
    ],
    defaultNegative: "bad quality, blurry, watermark, human, realistic, photo",
    resolution: { width: 768, height: 1024 },
  },

  highRes: {
    defaultModel: "novaFurryXL_ilV130.safetensors",
    defaultLoras: [],
    defaultNegative: "bad quality, blurry, low resolution",
    resolution: { width: 1024, height: 1536 },
  },

  landscape: {
    defaultModel: "yiffInHell_yihXXXTended.safetensors",
    defaultLoras: [],
    defaultNegative: "bad quality, blurry",
    resolution: { width: 1536, height: 768 },
  },
};

// Sample generation parameters
export const sampleGenerationParams = {
  default: {
    steps: 28,
    cfg: 7,
    sampler: "euler_ancestral",
    scheduler: "normal",
  },

  highQuality: {
    steps: 40,
    cfg: 8,
    sampler: "dpmpp_2m",
    scheduler: "karras",
  },

  fast: {
    steps: 15,
    cfg: 6,
    sampler: "euler",
    scheduler: "normal",
  },

  creative: {
    steps: 35,
    cfg: 5,
    sampler: "euler_ancestral",
    scheduler: "normal",
  },
};

// Sample prompts for different model families
export const samplePromptsByFamily = {
  illustrious: {
    prefix: "score_9, score_8_up, score_7_up, masterpiece",
    suffix: "",
    negative: "score_6, score_5, score_4, bad quality, blurry",
  },

  pony: {
    prefix: "score_9, score_8_up, score_7_up, source_furry",
    suffix: "",
    negative: "score_6_down, score_5_down, bad quality",
  },

  sdxl: {
    prefix: "masterpiece, best quality",
    suffix: "",
    negative: "worst quality, low quality, blurry",
  },

  flux: {
    prefix: "",
    suffix: "",
    negative: "",
  },
};

// Sample storyboard
export const sampleStoryboard = {
  name: "Midnight Charter",
  description: "A romantic adventure on the high seas",
  panelCount: 7,
  panels: [
    {
      position: 1,
      description: "Establishing shot of luxury yacht at sunset",
      direction: { cameraAngle: "wide shot", mood: "dramatic", lighting: "golden hour" },
    },
    {
      position: 2,
      description: "Otter character boards the yacht",
      direction: { cameraAngle: "medium shot", mood: "mysterious", lighting: "golden hour" },
    },
    {
      position: 3,
      description: "Wolf captain welcomes the otter",
      direction: { cameraAngle: "eye level", mood: "friendly", lighting: "soft" },
    },
    {
      position: 4,
      description: "Yacht sails into the night",
      direction: { cameraAngle: "wide shot", mood: "peaceful", lighting: "moonlight" },
    },
    {
      position: 5,
      description: "Characters share drinks on deck",
      direction: { cameraAngle: "medium shot", mood: "romantic", lighting: "candlelight" },
    },
    {
      position: 6,
      description: "Intimate moment under the stars",
      direction: { cameraAngle: "close-up", mood: "romantic", lighting: "moonlight" },
    },
    {
      position: 7,
      description: "Sunrise on the horizon, characters embrace",
      direction: { cameraAngle: "wide shot", mood: "joyful", lighting: "golden hour" },
    },
  ],
};

// Sample API responses for mocking
export const sampleApiResponses = {
  projectCreated: {
    id: "proj_abc123",
    name: "Test Project",
    description: "A test project",
    settings: sampleProjectSettings.default,
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
  },

  generationSuccess: {
    success: true,
    imagePath: "/output/gen_12345.png",
    seed: 98765,
    prompt: "score_9, score_8_up, anthro otter...",
    metadata: {
      width: 768,
      height: 1024,
      steps: 28,
      cfg: 7,
      sampler: "euler_ancestral",
    },
  },

  generationError: {
    success: false,
    error: "Model not found",
    code: "MODEL_NOT_FOUND",
  },
};

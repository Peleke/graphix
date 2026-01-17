/**
 * Prompting Reference by Model Family
 *
 * Synthesized from research on Civitai, HuggingFace, and community guides.
 * Used for crafting optimized prompts for different model architectures.
 */

export type ModelFamily = 'pony' | 'illustrious' | 'flux' | 'sdxl' | 'sd15';
export type ContentRating = 'safe' | 'questionable' | 'explicit';

// ============================================================================
// PONY DIFFUSION (yiffInHell, yiffyMix, novaFurry, etc.)
// ============================================================================

export const PONY_CONFIG = {
  /** Required score tags - place at start of prompt */
  scoreTags: ['score_9', 'score_8_up', 'score_7_up', 'score_6_up'],

  /** Source tags for content type */
  sourceTags: {
    furry: 'source_furry',
    anime: 'source_anime',
    cartoon: 'source_cartoon',
    pony: 'source_pony',
  },

  /** Rating tags for content level */
  ratingTags: {
    safe: 'rating_safe',
    questionable: 'rating_questionable',
    explicit: 'rating_explicit',
  },

  /** Recommended generation settings */
  settings: {
    cfg: 7,
    steps: 25,
    sampler: 'euler_ancestral',
    clipSkip: 2, // CRITICAL for quality
    width: 1024,
    height: 1024,
  },

  /** Standard negative prompt */
  negativePrompt: 'score_4, score_3, score_2, score_1, worst quality, low quality, blurry, jpeg artifacts, watermark, signature, text, human, bad anatomy, deformed, ugly, extra limbs',
};

// ============================================================================
// ILLUSTRIOUS XL (NoobAI, WAI, prefect, etc.)
// ============================================================================

export const ILLUSTRIOUS_CONFIG = {
  /** Quality tags - place at start */
  qualityTags: ['masterpiece', 'best quality', 'absurdres', 'newest'],

  /** Alternative quality boosters */
  qualityAlternatives: ['amazing quality', 'very aesthetic', 'highres'],

  /** Recency tags */
  recencyTags: {
    newest: 'newest',    // ~2023+
    recent: 'recent',    // ~2022
    modern: 'modern',    // ~2020
  },

  /** Recommended settings */
  settings: {
    cfg: 5.5,           // 4.5-7.5 range
    steps: 24,          // 20-28 range
    sampler: 'euler_ancestral',
    width: 1024,
    height: 1024,       // Up to 1536x1536 for v1.0+
  },

  /** Standard negative prompt */
  negativePrompt: 'lowres, (bad), bad anatomy, bad hands, extra digits, multiple views, fewer, extra, missing, text, error, worst quality, jpeg artifacts, low quality, watermark, unfinished, displeasing, oldest, early, chromatic aberration, signature, artistic error, username, scan',

  /** Tags to AVOID (not understood by model) */
  invalidTags: ['score_9', 'score_8', '8k', '4k', 'hdr', 'high quality', 'detailed'],
};

// ============================================================================
// NSFW TAG VOCABULARY (e621/booru style)
// ============================================================================

export const NSFW_TAGS = {
  /** Sexual actions */
  actions: {
    oral: ['oral', 'fellatio', 'cunnilingus', 'blowjob', 'deepthroat', 'licking', 'sucking'],
    penetration: ['sex', 'penetration', 'vaginal_penetration', 'anal_penetration', 'fucking'],
    manual: ['handjob', 'masturbation', 'mutual_masturbation', 'fingering', 'stroking'],
    other: ['grinding', 'humping', 'tribbing', 'frottage', 'titfuck', 'thighjob'],
  },

  /** Body parts */
  body: {
    breasts: ['breasts', 'large_breasts', 'huge_breasts', 'nipples', 'areolae', 'cleavage'],
    male: ['penis', 'erection', 'balls', 'sheath', 'knot', 'cock', 'shaft'],
    female: ['pussy', 'vulva', 'clit', 'spread_pussy', 'wet_pussy', 'labia'],
    rear: ['ass', 'anus', 'presenting', 'spread_ass', 'butt', 'rear'],
    oral: ['tongue', 'tongue_out', 'long_tongue', 'open_mouth', 'lips'],
  },

  /** Fluids */
  fluids: {
    cum: ['cum', 'cum_in_mouth', 'cum_on_face', 'cum_on_body', 'cum_inside', 'cum_drip', 'excessive_cum', 'cum_string', 'cum_pool', 'cum_on_breasts', 'facial'],
    precum: ['precum', 'precum_drip', 'leaking'],
    saliva: ['saliva', 'drool', 'saliva_string', 'drooling'],
    wetness: ['wet', 'sweaty', 'glistening'],
  },

  /** Poses and positions */
  poses: {
    lying: ['on_back', 'on_stomach', 'on_side', 'lying_down', 'sprawled'],
    kneeling: ['on_all_fours', 'kneeling', 'doggy_style', 'presenting_hindquarters'],
    sitting: ['cowgirl_position', 'reverse_cowgirl', 'sitting_on_face', 'lap_sitting'],
    standing: ['standing', 'against_wall', 'bent_over', 'from_behind'],
    spread: ['spread_legs', 'legs_up', 'legs_apart', 'spread_pussy', 'presenting'],
  },

  /** Expressions */
  expressions: {
    pleasure: ['ahegao', 'fucked_silly', 'rolling_eyes', 'cross-eyed', 'orgasm_face'],
    mouth: ['open_mouth', 'tongue_out', 'drooling', 'panting', 'moaning'],
    eyes: ['half-closed_eyes', 'bedroom_eyes', 'seductive', 'lustful_gaze'],
    emotion: ['blush', 'heavy_blush', 'flushed', 'embarrassed', 'enjoying', 'pleasure'],
  },

  /** Size and physique */
  physique: {
    build: ['muscular', 'bara', 'fit', 'toned', 'chubby', 'thicc', 'curvy', 'petite', 'slender'],
    size: ['size_difference', 'height_difference', 'bigger_male', 'smaller_female'],
    type: ['anthro', 'anthropomorphic', 'furry', 'feral'],
  },
};

// ============================================================================
// COMPOSITION AND CAMERA TAGS
// ============================================================================

export const COMPOSITION_TAGS = {
  /** Shot types */
  shots: ['close-up', 'medium_shot', 'wide_shot', 'full_body', 'portrait', 'cowboy_shot', 'upper_body'],

  /** Camera angles */
  angles: ['from_above', 'from_below', 'from_behind', 'from_side', 'three-quarter_view', 'dutch_angle'],

  /** POV options */
  pov: ['pov', 'first_person_view', 'male_pov', 'female_pov'],

  /** Focus */
  focus: ['face_focus', 'ass_focus', 'breast_focus', 'genital_focus'],
};

// ============================================================================
// LIGHTING AND MOOD
// ============================================================================

export const LIGHTING_TAGS = {
  intimate: ['warm_lighting', 'soft_shadows', 'candlelight', 'dim_lighting', 'ambient_light'],
  dramatic: ['rim_lighting', 'backlighting', 'dramatic_shadows', 'high_contrast', 'cinematic_lighting'],
  romantic: ['golden_hour', 'sunset', 'soft_glow', 'warm_tones', 'pink_lighting'],
  natural: ['natural_lighting', 'sunlight', 'daylight', 'window_light', 'morning_light'],
  night: ['moonlight', 'starlight', 'night_sky', 'blue_tones', 'low_light'],
};

// ============================================================================
// PROMPT BUILDERS
// ============================================================================

/**
 * Build a Pony-optimized prompt
 */
export function buildPonyPrompt(options: {
  source: keyof typeof PONY_CONFIG.sourceTags;
  rating: ContentRating;
  subject: string;
  actions?: string[];
  setting?: string;
  lighting?: string[];
  extras?: string[];
}): { positive: string; negative: string } {
  const parts: string[] = [
    ...PONY_CONFIG.scoreTags,
    PONY_CONFIG.sourceTags[options.source],
    PONY_CONFIG.ratingTags[options.rating],
    options.subject,
  ];

  if (options.actions?.length) parts.push(...options.actions);
  if (options.setting) parts.push(options.setting);
  if (options.lighting?.length) parts.push(...options.lighting);
  if (options.extras?.length) parts.push(...options.extras);

  return {
    positive: parts.join(', '),
    negative: PONY_CONFIG.negativePrompt,
  };
}

/**
 * Build an Illustrious-optimized prompt
 */
export function buildIllustriousPrompt(options: {
  subject: string;
  actions?: string[];
  setting?: string;
  lighting?: string[];
  style?: string[];
}): { positive: string; negative: string } {
  const parts: string[] = [
    ...ILLUSTRIOUS_CONFIG.qualityTags,
    options.subject,
  ];

  if (options.actions?.length) parts.push(...options.actions);
  if (options.setting) parts.push(options.setting);
  if (options.lighting?.length) parts.push(...options.lighting);
  if (options.style?.length) parts.push(...options.style);

  return {
    positive: parts.join(', '),
    negative: ILLUSTRIOUS_CONFIG.negativePrompt,
  };
}

/**
 * Get tags for a specific NSFW action category
 */
export function getNSFWTags(category: keyof typeof NSFW_TAGS, subcategory?: string): string[] {
  const cat = NSFW_TAGS[category];
  if (subcategory && subcategory in cat) {
    return (cat as Record<string, string[]>)[subcategory];
  }
  return Object.values(cat).flat();
}

/**
 * Build intensity-scaled NSFW tags
 */
export function buildNSFWIntensity(level: 'mild' | 'moderate' | 'intense' | 'extreme'): string[] {
  switch (level) {
    case 'mild':
      return ['suggestive', 'teasing', 'implied'];
    case 'moderate':
      return ['nude', 'naked', 'exposed', 'aroused'];
    case 'intense':
      return ['explicit', 'sex', 'penetration', 'oral', 'cum'];
    case 'extreme':
      return ['excessive_cum', 'ahegao', 'fucked_silly', 'multiple_penetration', 'gangbang'];
  }
}

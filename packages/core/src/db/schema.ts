/**
 * Graphix Database Schema
 *
 * Drizzle ORM schema definitions for all core entities.
 * Supports both Turso (LibSQL) and local SQLite.
 */

import { sqliteTable, text, integer, real, index } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => createId());

const timestamps = {
  createdAt: integer("created_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
};

// ============================================================================
// PROJECTS
// ============================================================================

export const projects = sqliteTable(
  "projects",
  {
    id: id(),
    name: text("name").notNull(),
    description: text("description").default(""),
    // JSON: { defaultModel, defaultLoras, defaultNegative, resolution: { width, height } }
    settings: text("settings", { mode: "json" }).$type<ProjectSettings>(),
    ...timestamps,
  },
  (table) => [index("projects_name_idx").on(table.name)]
);

export type ProjectSettings = {
  defaultModel: string;
  defaultLoras: Array<{ name: string; strength: number; strengthClip?: number }>;
  defaultNegative: string;
  resolution: { width: number; height: number };
};

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;

// ============================================================================
// CHARACTERS
// ============================================================================

export const characters = sqliteTable(
  "characters",
  {
    id: id(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    // JSON: { species, bodyType, features, ageDescriptors, clothing, distinguishing }
    profile: text("profile", { mode: "json" }).$type<CharacterProfile>().notNull(),
    // JSON: { positive, negative, triggers }
    promptFragments: text("prompt_fragments", { mode: "json" }).$type<PromptFragments>().notNull(),
    // JSON: array of image paths
    referenceImages: text("reference_images", { mode: "json" })
      .$type<string[]>()
      .default([])
      .notNull(),
    // JSON: { path, strength, trainedAt, trainingImages }
    lora: text("lora", { mode: "json" }).$type<CharacterLora | null>(),
    ...timestamps,
  },
  (table) => [
    index("characters_project_idx").on(table.projectId),
    index("characters_name_idx").on(table.name),
  ]
);

export type CharacterProfile = {
  species: string;
  bodyType: string;
  features: string[];
  ageDescriptors: string[];
  clothing: string[];
  distinguishing: string[];
  /** Optional base prompt for this character (used by PromptBuilder) */
  basePrompt?: string;
};

export type PromptFragments = {
  positive: string;
  negative: string;
  triggers: string[];
};

export type CharacterLora = {
  path: string;
  strength: number;
  strengthClip?: number;
  trainedAt: string; // ISO date string
  trainingImages: number;
};

export type Character = typeof characters.$inferSelect;
export type NewCharacter = typeof characters.$inferInsert;

// ============================================================================
// SCENE LIGHTING CONFIG TYPE (Phase 3.5 - defined early for storyboards reference)
// ============================================================================

export type LightSource = {
  type: "sun" | "moon" | "artificial" | "fire" | "window" | "ambient";
  direction:
    | "north"
    | "northeast"
    | "east"
    | "southeast"
    | "south"
    | "southwest"
    | "west"
    | "northwest"
    | "above"
    | "below";
  intensity: number; // 0-1
  color?: string; // hex color
};

export type SceneLightingConfig = {
  primarySource: LightSource;
  secondarySource?: LightSource;
  ambientColor?: string;
  ambientIntensity?: number;
  timeOfDay?: "dawn" | "morning" | "noon" | "afternoon" | "dusk" | "night";
  weather?: "clear" | "cloudy" | "overcast" | "foggy" | "rainy" | "stormy";
};

// ============================================================================
// STORYBOARDS
// ============================================================================

export const storyboards = sqliteTable(
  "storyboards",
  {
    id: id(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description").default(""),
    // Scene lighting configuration (Phase 3.5)
    lightingConfig: text("lighting_config", { mode: "json" }).$type<SceneLightingConfig>(),
    ...timestamps,
  },
  (table) => [
    index("storyboards_project_idx").on(table.projectId),
    index("storyboards_name_idx").on(table.name),
  ]
);

export type Storyboard = typeof storyboards.$inferSelect;
export type NewStoryboard = typeof storyboards.$inferInsert;

// ============================================================================
// PANELS
// ============================================================================

export const panels = sqliteTable(
  "panels",
  {
    id: id(),
    storyboardId: text("storyboard_id")
      .notNull()
      .references(() => storyboards.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    description: text("description").default(""),
    // JSON: { cameraAngle, mood, lighting }
    direction: text("direction", { mode: "json" }).$type<PanelDirection>(),
    // JSON: array of character IDs
    characterIds: text("character_ids", { mode: "json" }).$type<string[]>().default([]).notNull(),
    // Selected output from generations
    selectedOutputId: text("selected_output_id"),
    ...timestamps,
  },
  (table) => [
    index("panels_storyboard_idx").on(table.storyboardId),
    index("panels_position_idx").on(table.storyboardId, table.position),
  ]
);

export type PanelDirection = {
  cameraAngle: string;
  mood: string;
  lighting: string;
};

export type Panel = typeof panels.$inferSelect;
export type NewPanel = typeof panels.$inferInsert;

// ============================================================================
// PANEL CAPTIONS
// ============================================================================

export const panelCaptions = sqliteTable(
  "panel_captions",
  {
    id: id(),
    panelId: text("panel_id")
      .notNull()
      .references(() => panels.id, { onDelete: "cascade" }),
    type: text("type").notNull().$type<CaptionType>(),
    text: text("text").notNull(),
    characterId: text("character_id").references(() => characters.id, {
      onDelete: "set null",
    }),
    // JSON: { x: number, y: number } - percentage position
    position: text("position", { mode: "json" }).$type<CaptionPosition>().notNull(),
    // JSON: { x: number, y: number } - direction bubble tail points (for speech/thought)
    tailDirection: text("tail_direction", { mode: "json" }).$type<CaptionPosition>(),
    // JSON: CaptionStyle object
    style: text("style", { mode: "json" }).$type<Partial<CaptionStyle>>(),
    zIndex: integer("z_index").default(0).notNull(),
    ...timestamps,
  },
  (table) => [
    index("panel_captions_panel_idx").on(table.panelId),
    index("panel_captions_type_idx").on(table.type),
  ]
);

export type CaptionType = "speech" | "thought" | "narration" | "sfx" | "whisper";

export type CaptionPosition = {
  x: number; // percentage 0-100
  y: number; // percentage 0-100
};

export type CaptionStyle = {
  fontFamily: string;
  fontSize: number;
  fontColor: string;
  fontWeight: "normal" | "bold";
  backgroundColor: string;
  borderColor: string;
  borderWidth: number;
  borderStyle: "solid" | "dashed";
  opacity: number;
  padding: number;
  maxWidth: number; // percentage of panel width
};

export type PanelCaption = typeof panelCaptions.$inferSelect;
export type NewPanelCaption = typeof panelCaptions.$inferInsert;

// ============================================================================
// GENERATED IMAGES
// ============================================================================

export const generatedImages = sqliteTable(
  "generated_images",
  {
    id: id(),
    panelId: text("panel_id")
      .notNull()
      .references(() => panels.id, { onDelete: "cascade" }),
    // File paths
    localPath: text("local_path").notNull(),
    cloudUrl: text("cloud_url"),
    thumbnailPath: text("thumbnail_path"),
    // Generation parameters
    seed: integer("seed").notNull(),
    prompt: text("prompt").notNull(),
    negativePrompt: text("negative_prompt").default(""),
    model: text("model").notNull(),
    // JSON: array of { name, strength, strengthClip }
    loras: text("loras", { mode: "json" })
      .$type<Array<{ name: string; strength: number; strengthClip?: number }>>()
      .default([])
      .notNull(),
    // Generation settings
    steps: integer("steps").notNull(),
    cfg: real("cfg").notNull(),
    sampler: text("sampler").notNull(),
    scheduler: text("scheduler").default("normal"),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    // Variant tracking
    variantStrategy: text("variant_strategy"), // 'seed' | 'cfg' | 'sampler' | 'custom'
    variantIndex: integer("variant_index"),
    // Consistency info
    usedIPAdapter: integer("used_ip_adapter", { mode: "boolean" }).default(false),
    ipAdapterImages: text("ip_adapter_images", { mode: "json" }).$type<string[]>(),
    usedControlNet: integer("used_controlnet", { mode: "boolean" }).default(false),
    controlNetType: text("controlnet_type"),
    controlNetImage: text("controlnet_image"),
    // Selection status
    isSelected: integer("is_selected", { mode: "boolean" }).default(false),
    isFavorite: integer("is_favorite", { mode: "boolean" }).default(false),
    // User rating (1-5)
    rating: integer("rating"),
    ...timestamps,
  },
  (table) => [
    index("generated_images_panel_idx").on(table.panelId),
    index("generated_images_selected_idx").on(table.panelId, table.isSelected),
    index("generated_images_seed_idx").on(table.seed),
  ]
);

export type GeneratedImage = typeof generatedImages.$inferSelect;
export type NewGeneratedImage = typeof generatedImages.$inferInsert;

// ============================================================================
// PAGE LAYOUTS (for composition)
// ============================================================================

export const pageLayouts = sqliteTable("page_layouts", {
  id: id(),
  storyboardId: text("storyboard_id")
    .notNull()
    .references(() => storyboards.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  pageNumber: integer("page_number").notNull(),
  // JSON: { template, width, height, dpi, margin, gutter, backgroundColor }
  layoutConfig: text("layout_config", { mode: "json" }).$type<PageLayoutConfig>().notNull(),
  // JSON: array of { panelId, row, col, rowSpan, colSpan }
  panelPlacements: text("panel_placements", { mode: "json" })
    .$type<PanelPlacement[]>()
    .notNull(),
  // Rendered output
  renderedPath: text("rendered_path"),
  renderedAt: integer("rendered_at", { mode: "timestamp" }),
  ...timestamps,
});

export type PageLayoutConfig = {
  template: string;
  width: number;
  height: number;
  dpi: number;
  margin: number;
  gutter: number;
  backgroundColor: string;
  borderWidth?: number;
  borderColor?: string;
  borderRadius?: number;
};

export type PanelPlacement = {
  panelId: string;
  row: number;
  col: number;
  rowSpan: number;
  colSpan: number;
};

export type PageLayout = typeof pageLayouts.$inferSelect;
export type NewPageLayout = typeof pageLayouts.$inferInsert;

// ============================================================================
// POSE LIBRARY (Phase 3.5)
// ============================================================================

export const poseLibrary = sqliteTable(
  "pose_library",
  {
    id: id(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description").default(""),
    category: text("category").notNull(), // 'standing' | 'sitting' | 'action' | 'lying' | 'custom'
    // Path to extracted OpenPose skeleton image
    skeletonPath: text("skeleton_path").notNull(),
    // Source generation this pose was extracted from
    sourceGenerationId: text("source_generation_id").references(() => generatedImages.id, {
      onDelete: "set null",
    }),
    // JSON: OpenPose keypoint data
    poseData: text("pose_data", { mode: "json" }).$type<PoseData>(),
    // Tags for searchability
    tags: text("tags", { mode: "json" }).$type<string[]>().default([]).notNull(),
    // Usage tracking
    usageCount: integer("usage_count").default(0).notNull(),
    ...timestamps,
  },
  (table) => [
    index("pose_library_project_idx").on(table.projectId),
    index("pose_library_category_idx").on(table.category),
  ]
);

export type PoseData = {
  keypoints: Array<{ name: string; x: number; y: number; confidence: number }>;
  boundingBox: { x: number; y: number; width: number; height: number };
  hasHands: boolean;
  hasFace: boolean;
  format: "openpose" | "coco" | "mediapipe";
};

export type PoseLibraryEntry = typeof poseLibrary.$inferSelect;
export type NewPoseLibraryEntry = typeof poseLibrary.$inferInsert;

// ============================================================================
// EXPRESSION LIBRARY (Phase 3.5)
// ============================================================================

export const expressionLibrary = sqliteTable(
  "expression_library",
  {
    id: id(),
    characterId: text("character_id")
      .notNull()
      .references(() => characters.id, { onDelete: "cascade" }),
    name: text("name").notNull(), // 'happy', 'angry', 'ahegao', etc.
    description: text("description").default(""),
    // Reference image showing this expression
    referencePath: text("reference_path").notNull(),
    // Source generation this was extracted from
    sourceGenerationId: text("source_generation_id").references(() => generatedImages.id, {
      onDelete: "set null",
    }),
    // JSON: facial landmark/region data
    expressionData: text("expression_data", { mode: "json" }).$type<ExpressionData>(),
    // Prompt fragment that produces this expression
    promptFragment: text("prompt_fragment").notNull(),
    // Intensity level (1-10)
    intensity: integer("intensity").default(5),
    // Usage tracking
    usageCount: integer("usage_count").default(0).notNull(),
    ...timestamps,
  },
  (table) => [
    index("expression_library_character_idx").on(table.characterId),
    index("expression_library_name_idx").on(table.name),
  ]
);

export type ExpressionData = {
  faceRegion: { x: number; y: number; width: number; height: number };
  emotion: string;
  intensity: number;
};

export type ExpressionLibraryEntry = typeof expressionLibrary.$inferSelect;
export type NewExpressionLibraryEntry = typeof expressionLibrary.$inferInsert;

// ============================================================================
// INTERACTION POSES (Phase 3.5)
// ============================================================================

export const interactionPoses = sqliteTable(
  "interaction_poses",
  {
    id: id(),
    name: text("name").notNull().unique(), // 'missionary', 'cowgirl', 'holding_hands'
    displayName: text("display_name").notNull(),
    description: text("description").default(""),
    category: text("category").notNull(), // 'intimate' | 'romantic' | 'action' | 'conversation'
    characterCount: integer("character_count").notNull().default(2),
    // JSON: pose definitions for each character position
    poseDefinitions: text("pose_definitions", { mode: "json" })
      .$type<InteractionPoseDefinition[]>()
      .notNull(),
    // Optional reference skeleton images
    referenceImages: text("reference_images", { mode: "json" }).$type<string[]>().default([]).notNull(),
    // JSON: GLIGEN bounding boxes for character placement
    gligenBoxes: text("gligen_boxes", { mode: "json" }).$type<GligenBox[]>(),
    // Prompt fragments
    promptFragment: text("prompt_fragment").notNull(),
    negativeFragment: text("negative_fragment").default(""),
    // Tags for searchability
    tags: text("tags", { mode: "json" }).$type<string[]>().default([]).notNull(),
    // Content rating
    rating: text("rating").notNull().$type<"safe" | "suggestive" | "explicit">(),
    // Is this a built-in preset or user-created?
    isBuiltin: integer("is_builtin", { mode: "boolean" }).default(false).notNull(),
    // Usage tracking
    usageCount: integer("usage_count").default(0).notNull(),
    ...timestamps,
  },
  (table) => [
    index("interaction_poses_category_idx").on(table.category),
    index("interaction_poses_rating_idx").on(table.rating),
  ]
);

export type InteractionPoseDefinition = {
  position: "character_a" | "character_b" | "character_c";
  role: string; // 'top', 'bottom', 'left', 'right', etc.
  poseDescription: string;
  relativePosition?: string; // 'above', 'behind', 'facing', etc.
};

export type GligenBox = {
  position: "character_a" | "character_b" | "character_c";
  x: number; // 0-1 normalized
  y: number;
  width: number;
  height: number;
};

export type InteractionPose = typeof interactionPoses.$inferSelect;
export type NewInteractionPose = typeof interactionPoses.$inferInsert;

// ============================================================================
// CUSTOM ASSETS (LoRAs & Embeddings)
// ============================================================================

/**
 * Custom assets table for project-specific LoRAs and textual inversion embeddings.
 * These are user-provided or custom-trained models that can be applied to generations.
 */
export const customAssets = sqliteTable(
  "custom_assets",
  {
    id: id(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    // Optional character association (for character-specific LoRAs)
    characterId: text("character_id").references(() => characters.id, {
      onDelete: "set null",
    }),
    name: text("name").notNull(),
    displayName: text("display_name").notNull(),
    description: text("description").default(""),
    // Asset type
    type: text("type").notNull().$type<"lora" | "embedding">(),
    // File path to the asset (relative to ComfyUI models directory)
    filePath: text("file_path").notNull(),
    // Trigger word(s) to activate the asset
    triggerWord: text("trigger_word").notNull(),
    // Additional trigger words (aliases)
    triggerAliases: text("trigger_aliases", { mode: "json" })
      .$type<string[]>()
      .default([])
      .notNull(),
    // Recommended strength (0.0 - 2.0)
    defaultStrength: real("default_strength").default(1.0).notNull(),
    // For LoRAs: CLIP strength
    defaultClipStrength: real("default_clip_strength").default(1.0),
    // Training metadata
    trainedAt: integer("trained_at", { mode: "timestamp" }),
    baseModel: text("base_model"), // e.g., 'sdxl', 'sd15', 'pony'
    trainingSteps: integer("training_steps"),
    // Source images used for training (paths or URLs)
    sourceImages: text("source_images", { mode: "json" }).$type<string[]>(),
    // Arbitrary metadata
    metadata: text("metadata", { mode: "json" }).$type<Record<string, unknown>>(),
    // Usage tracking
    usageCount: integer("usage_count").default(0).notNull(),
    // Status
    isActive: integer("is_active", { mode: "boolean" }).default(true).notNull(),
    // Tags for organization
    tags: text("tags", { mode: "json" }).$type<string[]>().default([]).notNull(),
    ...timestamps,
  },
  (table) => [
    index("custom_assets_project_idx").on(table.projectId),
    index("custom_assets_character_idx").on(table.characterId),
    index("custom_assets_type_idx").on(table.type),
  ]
);

export type CustomAsset = typeof customAssets.$inferSelect;
export type NewCustomAsset = typeof customAssets.$inferInsert;

// ============================================================================
// RELATIONS
// ============================================================================

export const projectsRelations = relations(projects, ({ many }) => ({
  characters: many(characters),
  storyboards: many(storyboards),
  poseLibrary: many(poseLibrary),
  customAssets: many(customAssets),
}));

export const charactersRelations = relations(characters, ({ one, many }) => ({
  project: one(projects, {
    fields: [characters.projectId],
    references: [projects.id],
  }),
  expressionLibrary: many(expressionLibrary),
  customAssets: many(customAssets),
}));

export const storyboardsRelations = relations(storyboards, ({ one, many }) => ({
  project: one(projects, {
    fields: [storyboards.projectId],
    references: [projects.id],
  }),
  panels: many(panels),
  pageLayouts: many(pageLayouts),
}));

export const panelsRelations = relations(panels, ({ one, many }) => ({
  storyboard: one(storyboards, {
    fields: [panels.storyboardId],
    references: [storyboards.id],
  }),
  generatedImages: many(generatedImages),
  captions: many(panelCaptions),
}));

export const panelCaptionsRelations = relations(panelCaptions, ({ one }) => ({
  panel: one(panels, {
    fields: [panelCaptions.panelId],
    references: [panels.id],
  }),
  character: one(characters, {
    fields: [panelCaptions.characterId],
    references: [characters.id],
  }),
}));

export const generatedImagesRelations = relations(generatedImages, ({ one }) => ({
  panel: one(panels, {
    fields: [generatedImages.panelId],
    references: [panels.id],
  }),
}));

export const pageLayoutsRelations = relations(pageLayouts, ({ one }) => ({
  storyboard: one(storyboards, {
    fields: [pageLayouts.storyboardId],
    references: [storyboards.id],
  }),
}));

// Phase 3.5 Relations
export const poseLibraryRelations = relations(poseLibrary, ({ one }) => ({
  project: one(projects, {
    fields: [poseLibrary.projectId],
    references: [projects.id],
  }),
  sourceGeneration: one(generatedImages, {
    fields: [poseLibrary.sourceGenerationId],
    references: [generatedImages.id],
  }),
}));

export const expressionLibraryRelations = relations(expressionLibrary, ({ one }) => ({
  character: one(characters, {
    fields: [expressionLibrary.characterId],
    references: [characters.id],
  }),
  sourceGeneration: one(generatedImages, {
    fields: [expressionLibrary.sourceGenerationId],
    references: [generatedImages.id],
  }),
}));

export const customAssetsRelations = relations(customAssets, ({ one }) => ({
  project: one(projects, {
    fields: [customAssets.projectId],
    references: [projects.id],
  }),
  character: one(characters, {
    fields: [customAssets.characterId],
    references: [characters.id],
  }),
}));

// interactionPoses has no foreign key relations (standalone preset table)

// ============================================================================
// FUTURE: M2/M3 VIDEO SCHEMAS (placeholders)
// ============================================================================

// TODO: Add when implementing M2 (Interactive Panels)
// export const panelAnimations = sqliteTable('panel_animations', {...})

// TODO: Add when implementing M3 (Animated Shorts)
// export const scenes = sqliteTable('scenes', {...})
// export const shots = sqliteTable('shots', {...})
// export const transitions = sqliteTable('transitions', {...})

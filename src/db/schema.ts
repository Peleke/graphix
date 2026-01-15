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
// RELATIONS
// ============================================================================

export const projectsRelations = relations(projects, ({ many }) => ({
  characters: many(characters),
  storyboards: many(storyboards),
}));

export const charactersRelations = relations(characters, ({ one }) => ({
  project: one(projects, {
    fields: [characters.projectId],
    references: [projects.id],
  }),
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

// ============================================================================
// FUTURE: M2/M3 VIDEO SCHEMAS (placeholders)
// ============================================================================

// TODO: Add when implementing M2 (Interactive Panels)
// export const panelAnimations = sqliteTable('panel_animations', {...})

// TODO: Add when implementing M3 (Animated Shorts)
// export const scenes = sqliteTable('scenes', {...})
// export const shots = sqliteTable('shots', {...})
// export const transitions = sqliteTable('transitions', {...})

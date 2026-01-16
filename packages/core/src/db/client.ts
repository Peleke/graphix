/**
 * Database Client Factory
 *
 * Creates a Drizzle ORM client that can connect to either:
 * - Turso (LibSQL cloud) for distributed deployment
 * - Local SQLite for development and privacy-sensitive use
 * - In-memory SQLite for testing
 *
 * Uses factory pattern for flexibility - no global state in core.
 * Server packages call setDefaultDatabase() at startup.
 */

import { createClient, type Client } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import * as schema from "./schema.js";

// Type for our database instance with schema
export type Database = LibSQLDatabase<typeof schema>;

/**
 * Database configuration options
 */
export interface DatabaseConfig {
  /** Connection mode */
  mode: "turso" | "sqlite" | "memory";
  /** Turso URL (required for turso mode) */
  tursoUrl?: string;
  /** Turso auth token (required for turso mode) */
  tursoToken?: string;
  /** SQLite file path (required for sqlite mode) */
  sqlitePath?: string;
  /** Whether to log connection info */
  verbose?: boolean;
}

/**
 * Result of database creation
 */
export interface DatabaseConnection {
  /** Drizzle database instance */
  db: Database;
  /** Underlying libsql client (for raw queries) */
  client: Client;
  /** Configuration used to create this connection */
  config: DatabaseConfig;
  /** Close the connection */
  close: () => void;
}

/**
 * Create a new database connection
 *
 * @example
 * // Turso (cloud)
 * const { db } = createDatabase({
 *   mode: 'turso',
 *   tursoUrl: 'libsql://...',
 *   tursoToken: '...'
 * });
 *
 * @example
 * // Local SQLite
 * const { db } = createDatabase({
 *   mode: 'sqlite',
 *   sqlitePath: './graphix.db'
 * });
 *
 * @example
 * // In-memory (testing)
 * const { db } = createDatabase({ mode: 'memory' });
 */
export function createDatabase(config: DatabaseConfig): DatabaseConnection {
  let client: Client;

  if (config.mode === "turso") {
    if (!config.tursoUrl || !config.tursoToken) {
      throw new Error(
        "Turso mode requires tursoUrl and tursoToken in config"
      );
    }

    client = createClient({
      url: config.tursoUrl,
      authToken: config.tursoToken,
    });

    if (config.verbose) {
      console.log(`[DB] Connected to Turso: ${config.tursoUrl}`);
    }
  } else if (config.mode === "sqlite") {
    const path = config.sqlitePath || "./graphix.db";
    client = createClient({
      url: `file:${path}`,
    });

    if (config.verbose) {
      console.log(`[DB] Connected to SQLite: ${path}`);
    }
  } else {
    // In-memory for testing
    client = createClient({ url: ":memory:" });

    if (config.verbose) {
      console.log("[DB] Connected to in-memory SQLite");
    }
  }

  const db = drizzle(client, { schema });

  return {
    db,
    client,
    config,
    close: () => {
      client.close();
      if (config.verbose) {
        console.log("[DB] Connection closed");
      }
    },
  };
}

/**
 * Create an in-memory database for testing
 * Convenience wrapper around createDatabase
 */
export function createTestDatabase(): DatabaseConnection {
  return createDatabase({ mode: "memory" });
}

// ============================================================================
// DEFAULT DATABASE (singleton pattern for backward compatibility)
// ============================================================================

let defaultConnection: DatabaseConnection | null = null;

/**
 * Set the default database instance
 * Call this once at server startup after loading config
 */
export function setDefaultDatabase(connection: DatabaseConnection): void {
  if (defaultConnection) {
    console.warn("[DB] Warning: replacing existing default database connection");
  }
  defaultConnection = connection;
}

/**
 * Get the default database instance
 * Throws if not initialized via setDefaultDatabase()
 */
export function getDefaultDatabase(): Database {
  if (!defaultConnection) {
    throw new Error(
      "Database not initialized. Call setDefaultDatabase() first, or use createDatabase() directly."
    );
  }
  return defaultConnection.db;
}

/**
 * Get the default database connection (includes client and close)
 * Throws if not initialized
 */
export function getDefaultConnection(): DatabaseConnection {
  if (!defaultConnection) {
    throw new Error(
      "Database not initialized. Call setDefaultDatabase() first."
    );
  }
  return defaultConnection;
}

/**
 * Check if default database is initialized
 */
export function hasDefaultDatabase(): boolean {
  return defaultConnection !== null;
}

/**
 * Close and clear the default database connection
 */
export function closeDefaultDatabase(): void {
  if (defaultConnection) {
    defaultConnection.close();
    defaultConnection = null;
  }
}

// ============================================================================
// LEGACY COMPATIBILITY
// ============================================================================

/**
 * @deprecated Use createDatabase() or getDefaultDatabase()
 * Legacy function - returns the default db instance
 */
export function getDb(): Database {
  return getDefaultDatabase();
}

/**
 * @deprecated Use connection.client from createDatabase() or getDefaultConnection()
 * Legacy function - returns the default client
 */
export function getClient(): Client {
  return getDefaultConnection().client;
}

/**
 * @deprecated Use closeDefaultDatabase()
 * Legacy function - closes the default connection
 */
export async function closeDb(): Promise<void> {
  closeDefaultDatabase();
}

/**
 * @deprecated Use createTestDatabase()
 * Legacy function - creates an in-memory database
 */
export function createTestDb(): Database {
  return createTestDatabase().db;
}

// ============================================================================
// MIGRATIONS
// ============================================================================

/**
 * Run schema migrations
 * Creates tables if they don't exist (Drizzle push alternative)
 */
export async function migrateDatabase(client: Client): Promise<void> {
  await client.executeMultiple(`
    -- Projects table
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      settings TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS projects_name_idx ON projects(name);

    -- Characters table
    CREATE TABLE IF NOT EXISTS characters (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      profile TEXT NOT NULL,
      prompt_fragments TEXT NOT NULL,
      reference_images TEXT NOT NULL DEFAULT '[]',
      lora TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS characters_project_idx ON characters(project_id);
    CREATE INDEX IF NOT EXISTS characters_name_idx ON characters(name);

    -- Storyboards table
    CREATE TABLE IF NOT EXISTS storyboards (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      lighting_config TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS storyboards_project_idx ON storyboards(project_id);
    CREATE INDEX IF NOT EXISTS storyboards_name_idx ON storyboards(name);

    -- Panels table
    CREATE TABLE IF NOT EXISTS panels (
      id TEXT PRIMARY KEY,
      storyboard_id TEXT NOT NULL REFERENCES storyboards(id) ON DELETE CASCADE,
      position INTEGER NOT NULL,
      description TEXT DEFAULT '',
      direction TEXT,
      character_ids TEXT NOT NULL DEFAULT '[]',
      selected_output_id TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS panels_storyboard_idx ON panels(storyboard_id);
    CREATE INDEX IF NOT EXISTS panels_position_idx ON panels(storyboard_id, position);

    -- Panel Captions table
    CREATE TABLE IF NOT EXISTS panel_captions (
      id TEXT PRIMARY KEY,
      panel_id TEXT NOT NULL REFERENCES panels(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      text TEXT NOT NULL,
      character_id TEXT REFERENCES characters(id) ON DELETE SET NULL,
      position TEXT NOT NULL,
      tail_direction TEXT,
      style TEXT,
      z_index INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS panel_captions_panel_idx ON panel_captions(panel_id);
    CREATE INDEX IF NOT EXISTS panel_captions_type_idx ON panel_captions(type);

    -- Generated Images table
    CREATE TABLE IF NOT EXISTS generated_images (
      id TEXT PRIMARY KEY,
      panel_id TEXT NOT NULL REFERENCES panels(id) ON DELETE CASCADE,
      local_path TEXT NOT NULL,
      cloud_url TEXT,
      thumbnail_path TEXT,
      seed INTEGER NOT NULL,
      prompt TEXT NOT NULL,
      negative_prompt TEXT DEFAULT '',
      model TEXT NOT NULL,
      loras TEXT NOT NULL DEFAULT '[]',
      steps INTEGER NOT NULL,
      cfg REAL NOT NULL,
      sampler TEXT NOT NULL,
      scheduler TEXT DEFAULT 'normal',
      width INTEGER NOT NULL,
      height INTEGER NOT NULL,
      variant_strategy TEXT,
      variant_index INTEGER,
      used_ip_adapter INTEGER DEFAULT 0,
      ip_adapter_images TEXT,
      used_controlnet INTEGER DEFAULT 0,
      controlnet_type TEXT,
      controlnet_image TEXT,
      is_selected INTEGER DEFAULT 0,
      is_favorite INTEGER DEFAULT 0,
      rating INTEGER,
      review_status TEXT DEFAULT 'pending',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS generated_images_panel_idx ON generated_images(panel_id);
    CREATE INDEX IF NOT EXISTS generated_images_selected_idx ON generated_images(panel_id, is_selected);
    CREATE INDEX IF NOT EXISTS generated_images_seed_idx ON generated_images(seed);

    -- Image Reviews table (Review System)
    CREATE TABLE IF NOT EXISTS image_reviews (
      id TEXT PRIMARY KEY,
      generated_image_id TEXT NOT NULL REFERENCES generated_images(id) ON DELETE CASCADE,
      panel_id TEXT NOT NULL REFERENCES panels(id) ON DELETE CASCADE,
      score REAL NOT NULL,
      status TEXT NOT NULL,
      issues TEXT,
      recommendation TEXT,
      iteration INTEGER NOT NULL DEFAULT 1,
      previous_review_id TEXT REFERENCES image_reviews(id),
      reviewed_by TEXT NOT NULL,
      human_reviewer_id TEXT,
      human_feedback TEXT,
      action_taken TEXT,
      regenerated_image_id TEXT REFERENCES generated_images(id),
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS image_reviews_image_idx ON image_reviews(generated_image_id);
    CREATE INDEX IF NOT EXISTS image_reviews_panel_idx ON image_reviews(panel_id);
    CREATE INDEX IF NOT EXISTS image_reviews_status_idx ON image_reviews(status);

    -- Page Layouts table
    CREATE TABLE IF NOT EXISTS page_layouts (
      id TEXT PRIMARY KEY,
      storyboard_id TEXT NOT NULL REFERENCES storyboards(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      page_number INTEGER NOT NULL,
      layout_config TEXT NOT NULL,
      panel_placements TEXT NOT NULL,
      rendered_path TEXT,
      rendered_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS page_layouts_storyboard_idx ON page_layouts(storyboard_id);

    -- Pose Library table (Phase 3.5)
    CREATE TABLE IF NOT EXISTS pose_library (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      category TEXT NOT NULL,
      skeleton_path TEXT NOT NULL,
      source_generation_id TEXT REFERENCES generated_images(id) ON DELETE SET NULL,
      pose_data TEXT,
      tags TEXT NOT NULL DEFAULT '[]',
      usage_count INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS pose_library_project_idx ON pose_library(project_id);
    CREATE INDEX IF NOT EXISTS pose_library_category_idx ON pose_library(category);

    -- Expression Library table (Phase 3.5)
    CREATE TABLE IF NOT EXISTS expression_library (
      id TEXT PRIMARY KEY,
      character_id TEXT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      reference_path TEXT NOT NULL,
      source_generation_id TEXT REFERENCES generated_images(id) ON DELETE SET NULL,
      expression_data TEXT,
      prompt_fragment TEXT NOT NULL,
      intensity INTEGER DEFAULT 5,
      usage_count INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS expression_library_character_idx ON expression_library(character_id);
    CREATE INDEX IF NOT EXISTS expression_library_name_idx ON expression_library(name);

    -- Interaction Poses table (Phase 3.5)
    CREATE TABLE IF NOT EXISTS interaction_poses (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      display_name TEXT NOT NULL,
      description TEXT DEFAULT '',
      category TEXT NOT NULL,
      character_count INTEGER NOT NULL DEFAULT 2,
      pose_definitions TEXT NOT NULL,
      reference_images TEXT NOT NULL DEFAULT '[]',
      gligen_boxes TEXT,
      prompt_fragment TEXT NOT NULL,
      negative_fragment TEXT DEFAULT '',
      tags TEXT NOT NULL DEFAULT '[]',
      rating TEXT NOT NULL,
      is_builtin INTEGER NOT NULL DEFAULT 0,
      usage_count INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS interaction_poses_category_idx ON interaction_poses(category);
    CREATE INDEX IF NOT EXISTS interaction_poses_rating_idx ON interaction_poses(rating);

    -- Custom Assets table (Phase 3.5)
    CREATE TABLE IF NOT EXISTS custom_assets (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      character_id TEXT REFERENCES characters(id) ON DELETE SET NULL,
      name TEXT NOT NULL,
      display_name TEXT NOT NULL,
      description TEXT DEFAULT '',
      type TEXT NOT NULL,
      file_path TEXT NOT NULL,
      trigger_word TEXT NOT NULL,
      trigger_aliases TEXT NOT NULL DEFAULT '[]',
      default_strength REAL NOT NULL DEFAULT 1.0,
      default_clip_strength REAL DEFAULT 1.0,
      trained_at INTEGER,
      base_model TEXT,
      training_steps INTEGER,
      source_images TEXT,
      metadata TEXT,
      usage_count INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      tags TEXT NOT NULL DEFAULT '[]',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS custom_assets_project_idx ON custom_assets(project_id);
    CREATE INDEX IF NOT EXISTS custom_assets_character_idx ON custom_assets(character_id);
    CREATE INDEX IF NOT EXISTS custom_assets_type_idx ON custom_assets(type);
  `);

  console.error("[DB] Schema migration complete");
}

/**
 * Run migrations on default database
 * @deprecated Use migrateDatabase(client) directly
 */
export async function migrateDb(): Promise<void> {
  const { client } = getDefaultConnection();
  await migrateDatabase(client);
}

/**
 * Check database health
 */
export async function checkDatabaseHealth(
  client: Client,
  mode: string
): Promise<{
  connected: boolean;
  mode: string;
  latencyMs: number;
  error?: string;
}> {
  const start = Date.now();

  try {
    await client.execute("SELECT 1");

    return {
      connected: true,
      mode,
      latencyMs: Date.now() - start,
    };
  } catch (error) {
    return {
      connected: false,
      mode,
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Legacy wrapper for checkDatabaseHealth using default connection
 */
export async function checkDbHealth(): Promise<{
  connected: boolean;
  mode: string;
  latencyMs: number;
  error?: string;
}> {
  const connection = getDefaultConnection();
  return checkDatabaseHealth(connection.client, connection.config.mode);
}

// Re-export schema for convenience
export { schema };

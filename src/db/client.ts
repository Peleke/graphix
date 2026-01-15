/**
 * Database Client
 *
 * Creates a Drizzle ORM client that can connect to either:
 * - Turso (LibSQL cloud) for distributed deployment
 * - Local SQLite for development and privacy-sensitive use
 *
 * Toggle via STORAGE_MODE environment variable.
 */

import { createClient, type Client } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import { config } from "../config.js";
import * as schema from "./schema.js";

// Type for our database instance with schema
export type Database = LibSQLDatabase<typeof schema>;

// Singleton instances
let client: Client | null = null;
let db: Database | null = null;

/**
 * Get or create the database client
 */
export function getClient(): Client {
  if (client) return client;

  if (config.storage.mode === "turso") {
    if (!config.storage.tursoUrl || !config.storage.tursoToken) {
      throw new Error(
        "Turso mode requires TURSO_URL and TURSO_AUTH_TOKEN environment variables"
      );
    }

    client = createClient({
      url: config.storage.tursoUrl,
      authToken: config.storage.tursoToken,
    });

    console.log(`[DB] Connected to Turso: ${config.storage.tursoUrl}`);
  } else {
    // Local SQLite
    client = createClient({
      url: `file:${config.storage.sqlitePath}`,
    });

    console.log(`[DB] Connected to SQLite: ${config.storage.sqlitePath}`);
  }

  return client;
}

/**
 * Get or create the Drizzle database instance
 */
export function getDb(): Database {
  if (db) return db;

  const client = getClient();
  db = drizzle(client, { schema });

  return db;
}

/**
 * Close the database connection
 */
export async function closeDb(): Promise<void> {
  if (client) {
    client.close();
    client = null;
    db = null;
    console.log("[DB] Connection closed");
  }
}

/**
 * Create an in-memory database for testing
 */
export function createTestDb(): Database {
  const testClient = createClient({ url: ":memory:" });
  return drizzle(testClient, { schema });
}

/**
 * Run schema migrations (push)
 * For development: creates tables if they don't exist
 */
export async function migrateDb(): Promise<void> {
  const client = getClient();

  // Create tables using raw SQL (Drizzle push alternative)
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
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS generated_images_panel_idx ON generated_images(panel_id);
    CREATE INDEX IF NOT EXISTS generated_images_selected_idx ON generated_images(panel_id, is_selected);
    CREATE INDEX IF NOT EXISTS generated_images_seed_idx ON generated_images(seed);

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
  `);

  console.log("[DB] Schema migration complete");
}

/**
 * Check database health
 */
export async function checkDbHealth(): Promise<{
  connected: boolean;
  mode: string;
  latencyMs: number;
  error?: string;
}> {
  const start = Date.now();

  try {
    const client = getClient();
    await client.execute("SELECT 1");

    return {
      connected: true,
      mode: config.storage.mode,
      latencyMs: Date.now() - start,
    };
  } catch (error) {
    return {
      connected: false,
      mode: config.storage.mode,
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Export schema for convenience
export { schema };

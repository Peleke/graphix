/**
 * Database Module
 *
 * Exports database client factory and schema.
 */

// Client factory and connection management
export {
  // Types
  type Database,
  type DatabaseConfig,
  type DatabaseConnection,
  // Factory functions
  createDatabase,
  createTestDatabase,
  // Default database management
  setDefaultDatabase,
  getDefaultDatabase,
  getDefaultConnection,
  hasDefaultDatabase,
  closeDefaultDatabase,
  // Migrations
  migrateDatabase,
  checkDatabaseHealth,
  // Legacy compatibility
  getDb,
  getClient,
  closeDb,
  createTestDb,
  migrateDb,
  checkDbHealth,
  // Schema re-export
  schema,
} from "./client.js";

// Schema exports (types and tables)
export * from "./schema.js";

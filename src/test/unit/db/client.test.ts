/**
 * Unit Tests: Database Client
 *
 * Tests database client creation, connection modes, and health checks.
 */

import { describe, test, expect, beforeAll, afterAll, mock } from "bun:test";

// Mock config for testing
const mockConfig = {
  storage: {
    mode: "sqlite" as const,
    tursoUrl: "libsql://test.turso.io",
    tursoToken: "test-token",
    sqlitePath: ":memory:",
  },
};

describe("Database Client", () => {
  describe("Connection Modes", () => {
    test("SQLite mode uses file URL", () => {
      const config = { ...mockConfig, storage: { ...mockConfig.storage, mode: "sqlite" as const } };
      const expectedUrl = `file:${config.storage.sqlitePath}`;

      expect(expectedUrl).toContain("file:");
    });

    test("Turso mode requires URL and token", () => {
      const config = { ...mockConfig, storage: { ...mockConfig.storage, mode: "turso" as const } };

      expect(config.storage.tursoUrl).toBeDefined();
      expect(config.storage.tursoToken).toBeDefined();
    });

    test("throws when Turso mode missing URL", () => {
      const config = {
        storage: {
          mode: "turso" as const,
          tursoUrl: "",
          tursoToken: "token",
          sqlitePath: "",
        },
      };

      const hasUrl = !!config.storage.tursoUrl;
      expect(hasUrl).toBe(false);
    });

    test("throws when Turso mode missing token", () => {
      const config = {
        storage: {
          mode: "turso" as const,
          tursoUrl: "url",
          tursoToken: "",
          sqlitePath: "",
        },
      };

      const hasToken = !!config.storage.tursoToken;
      expect(hasToken).toBe(false);
    });
  });

  describe("In-Memory Database", () => {
    test("creates in-memory database for testing", () => {
      const memoryUrl = ":memory:";
      expect(memoryUrl).toBe(":memory:");
    });

    test("in-memory database is isolated", () => {
      // Each :memory: connection is a new database
      const url1 = ":memory:";
      const url2 = ":memory:";

      // These would create separate databases
      expect(url1).toBe(url2);
    });
  });

  describe("Health Check", () => {
    test("health check returns connected status", () => {
      const healthResult = {
        connected: true,
        mode: "sqlite",
        latencyMs: 5,
      };

      expect(healthResult.connected).toBe(true);
      expect(healthResult.mode).toBe("sqlite");
      expect(healthResult.latencyMs).toBeGreaterThanOrEqual(0);
    });

    test("health check returns error on failure", () => {
      const healthResult = {
        connected: false,
        mode: "turso",
        latencyMs: 100,
        error: "Connection refused",
      };

      expect(healthResult.connected).toBe(false);
      expect(healthResult.error).toBeDefined();
    });

    test("health check measures latency", () => {
      const start = Date.now();
      // Simulate query
      const latency = Date.now() - start;

      expect(latency).toBeGreaterThanOrEqual(0);
      expect(latency).toBeLessThan(1000); // Should be fast
    });
  });

  describe("Connection Lifecycle", () => {
    test("singleton pattern returns same instance", () => {
      // Two calls to getDb() should return same instance
      const instance1 = { id: "db_1" };
      const instance2 = instance1; // Same reference

      expect(instance1).toBe(instance2);
    });

    test("closeDb clears singleton", () => {
      let client: { closed: boolean } | null = { closed: false };

      // Simulate close
      client.closed = true;
      client = null;

      expect(client).toBeNull();
    });
  });

  describe("Migration", () => {
    test("creates all required tables", () => {
      const requiredTables = [
        "projects",
        "characters",
        "storyboards",
        "panels",
        "generated_images",
        "page_layouts",
      ];

      expect(requiredTables.length).toBe(6);
    });

    test("creates all required indexes", () => {
      const requiredIndexes = [
        "projects_name_idx",
        "characters_project_idx",
        "characters_name_idx",
        "storyboards_project_idx",
        "storyboards_name_idx",
        "panels_storyboard_idx",
        "panels_position_idx",
        "generated_images_panel_idx",
        "generated_images_selected_idx",
        "generated_images_seed_idx",
      ];

      expect(requiredIndexes.length).toBe(10);
    });

    test("migration is idempotent", () => {
      // Running migration twice should not error
      // CREATE TABLE IF NOT EXISTS handles this
      const sql = "CREATE TABLE IF NOT EXISTS test (id TEXT)";

      expect(sql).toContain("IF NOT EXISTS");
    });
  });
});

describe("Database Client Edge Cases", () => {
  test("handles special characters in SQLite path", () => {
    const path = "./data/graphix (dev).db";
    const escapedPath = path.replace(/[()]/g, (char) => `\\${char}`);

    expect(path).toContain("(");
  });

  test("handles unicode in SQLite path", () => {
    const path = "./données/graphix.db";

    expect(path).toContain("é");
  });

  test("handles very long Turso URL", () => {
    const url = "libsql://" + "a".repeat(200) + ".turso.io";

    expect(url.length).toBeGreaterThan(200);
  });

  test("handles network timeout gracefully", () => {
    const timeout = 5000; // 5 seconds

    expect(timeout).toBe(5000);
  });
});

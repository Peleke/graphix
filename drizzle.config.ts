import type { Config } from "drizzle-kit";
import { resolve } from "node:path";

const isTurso = process.env.STORAGE_MODE === "turso";

// Always use absolute path to avoid issues when running from different directories
// process.cwd() is the directory from which drizzle-kit is run (monorepo root)
const defaultDbPath = resolve(process.cwd(), "./graphix.db");

export default {
  schema: "./packages/core/src/db/schema.ts",
  out: "./packages/core/src/db/migrations",
  dialect: "turso",
  dbCredentials: isTurso
    ? {
        url: process.env.TURSO_URL!,
        authToken: process.env.TURSO_AUTH_TOKEN,
      }
    : {
        url: `file:${process.env.SQLITE_PATH || defaultDbPath}`,
      },
} satisfies Config;
